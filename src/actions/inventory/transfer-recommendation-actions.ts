"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// --- CONSTANTS & DEFAULTS ---
const DEFAULT_RULES = {
    min_transfer_threshold: 3,
    aggressive_factor: 3,
    retention_strategy: "KEEP_SMALLEST",
    retention_count: 1
};
const VELOCITY_DAYS = 30; // Hız analizi (System Setting yapılabilir ama şimdilik sabit)

// --- TYPES ---
type StoreStat = {
    storeId: string;
    velocity: number; // Son X gündeki satış adedi
    variantsHeld: { variantId: string; quantity: number; size: string }[]; // Elindeki stoklar
}

/**
 * --------------------------------------------------------
 * ANA FONKSİYON: TÜM SİSTEM İÇİN ÖNERİLERİ YENİLE (Dynamic SaaS Version)
 * --------------------------------------------------------
 */
export async function refreshAllRecommendations() {
    try {
        // 0. Ayarları Çek
        const rulesSetting = await db.systemSetting.findUnique({ where: { key: "inventory.transfer_rules" } });
        const rules = rulesSetting ? (rulesSetting.value as typeof DEFAULT_RULES) : DEFAULT_RULES;

        // Destructuring for cleaner code
        const { min_transfer_threshold, aggressive_factor, retention_strategy, retention_count } = rules;

        // 1. Temizlik
        await db.stockTransfer.deleteMany({
            where: { status: "RECOMMENDED" }
        });

        // 2. Sistem Verisini Çek
        const state = await getSystemState();
        if (!state) return { success: false, error: "Veri çekilemedi." };

        const { stores, models, salesMap } = state;
        const proposedMoves: { sourceId: string, targetId: string, variantId: string, qty: number, reason: string }[] = [];

        // 3. Her Modeli Analiz Et
        for (const model of models) {
            const activeVariants = model.variants;
            if (activeVariants.length === 0) continue;

            // A. Mağaza İstatistiklerini Hesapla
            const storeStats: StoreStat[] = stores.map(store => {
                let velocity = 0;
                const variantsHeld: { variantId: string; quantity: number; size: string }[] = [];
                for (const v of activeVariants) {
                    const sold = salesMap.get(`${v.id}_${store.id}`) || 0;
                    velocity += sold;
                    const stock = v.stocks.find(s => s.storeId === store.id)?.quantity || 0;
                    if (stock > 0) variantsHeld.push({ variantId: v.id, quantity: stock, size: v.size || "" });
                }
                return { storeId: store.id, velocity, variantsHeld };
            });

            // B. Mağazaları Hıza Göre Sırala
            // Eğer strateji ters ise (Örn: En çok satandan alıp en az satana ver gibi garip bir kural varsa?)
            // Şimdilik standart: Çok satan Receiver, Az satan Donor.
            storeStats.sort((a, b) => b.velocity - a.velocity);

            // C. Eşleştirme Mantığı
            for (let i = 0; i < storeStats.length; i++) {
                const receiver = storeStats[i];
                if (receiver.velocity === 0 && retention_strategy !== 'DRAIN_ALL') continue;
                // DRAIN_ALL modunda Receiver ölü bile olsa depo ise alabilir.

                for (let j = storeStats.length - 1; j > i; j--) {
                    const donor = storeStats[j];
                    if (receiver.storeId === donor.storeId) continue;

                    // --- KARAR MEKANİZMASI (Dynamic Rules) ---
                    const isAggressive = receiver.velocity >= (donor.velocity * aggressive_factor);

                    // Donör Envanterini Stratejiye Göre Sırala
                    // Hangi ürünü "Tutmalı" (Retain)?
                    // Sıralamanın EN BAŞINDAKİ ürünler "En Değerli" kabul edilip korunacak.
                    let donorInventory = [...donor.variantsHeld];

                    if (retention_strategy === 'KEEP_SMALLEST') {
                        donorInventory.sort((a, b) => compareSizes(a.size, b.size)); // [36, 37, 38] -> 36 korunur
                    } else if (retention_strategy === 'KEEP_LARGEST') {
                        donorInventory.sort((a, b) => compareSizes(b.size, a.size)); // [44, 43, 42] -> 44 korunur
                    } else if (retention_strategy === 'KEEP_MOST_STOCKED') {
                        donorInventory.sort((a, b) => b.quantity - a.quantity); // En çok stoğu olanı koru
                    } else if (retention_strategy === 'DRAIN_ALL') {
                        // Korumak yok. Sıralama önemsiz.
                    }

                    // Korumaya alınan ürünler (İlk N tanesi)
                    const protectedItemIds = new Set<string>();
                    if (retention_strategy !== 'DRAIN_ALL') {
                        for (let k = 0; k < Math.min(retention_count, donorInventory.length); k++) {
                            protectedItemIds.add(donorInventory[k].variantId);
                        }
                    }

                    for (const item of donorInventory) {
                        let transferQty = 0;
                        let reason = "";

                        const receiverHasItem = activeVariants.find(v => v.id === item.variantId)?.stocks.find(s => s.storeId === receiver.storeId)?.quantity || 0;

                        if (receiverHasItem > 0 && !isAggressive) continue;

                        const isProtected = protectedItemIds.has(item.variantId);

                        // --- KURAL SETİ ---
                        if (isAggressive) { // VAKUM
                            if (isProtected) {
                                // Korunan üründen N tane kalmalı
                                if (item.quantity > 1) { // Basitçe 1 varsayıyoruz retention_count inventory bazlı ise detaylı logic gerekir.
                                    // retention_count tüm "çeşit" sayısı mı yoksa "stok adedi" mi? 
                                    // User request: "retention_count: 1" -> "En az bir full seri veya 1 adet smallest"
                                    // Genelde "1 adet numune bırak" demektir.
                                    transferQty = item.quantity - 1;
                                    reason = `Agresif (${retention_strategy} Korundu)`;
                                }
                            } else {
                                transferQty = item.quantity; // Hepsini al
                                reason = "Agresif (Tüm Stok)";
                            }
                        } else if (receiverHasItem === 0) { // SOFT FILL
                            if (item.quantity > 1) {
                                transferQty = Math.floor(item.quantity / 2);
                                if (transferQty < 1) transferQty = 1;

                                // Donörde 1 bırak
                                if (item.quantity - transferQty < 1) transferQty = item.quantity - 1;

                                if (transferQty > 0) reason = "Eksik Tamamlama";
                            }
                        }

                        if (transferQty > 0) {
                            proposedMoves.push({
                                sourceId: donor.storeId,
                                targetId: receiver.storeId,
                                variantId: item.variantId,
                                qty: transferQty,
                                reason
                            });
                            item.quantity -= transferQty; // Sanal düşüş
                        }
                    }
                }
            }
        }

        // 4. Batch Creation (Gruplama)
        const batches = new Map<string, { variantId: string, qty: number }[]>();
        for (const move of proposedMoves) {
            const key = `${move.sourceId}|${move.targetId}`;
            const existing = batches.get(key) || [];
            const vIndex = existing.findIndex(e => e.variantId === move.variantId);
            if (vIndex >= 0) existing[vIndex].qty += move.qty;
            else existing.push({ variantId: move.variantId, qty: move.qty });
            batches.set(key, existing);
        }

        let createdCount = 0;
        for (const [key, items] of batches.entries()) {
            const [sourceId, targetId] = key.split('|');
            const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

            // Dynamic Threshold Check
            if (totalQty < min_transfer_threshold) continue;

            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const rdm = Math.floor(Math.random() * 9999);
            const transferNo = `REC-${dateStr}-${rdm}`;

            await db.stockTransfer.create({
                data: {
                    transferNo,
                    sourceStoreId: sourceId,
                    targetStoreId: targetId,
                    status: "RECOMMENDED",
                    note: `SaaS Oto. (${totalQty} ürün) - ${retention_strategy}`,
                    items: {
                        create: items.map(i => ({
                            variantId: i.variantId,
                            quantitySent: i.qty,
                            quantityReceived: 0
                        }))
                    }
                }
            });
            createdCount++;
        }

        revalidatePath("/dashboard/transfers");
        return { success: true, message: `${createdCount} adet transfer önerisi oluşturuldu.` };

    } catch (error) {
        console.error("Smart Refill Error:", error);
        return { success: false, error: "Öneriler oluşturulurken hata oluştu." };
    }
}

// --- YARDIMCI FONKSİYONLAR ---

/**
 * Bedenleri sıralar (36 < 37 < 38 veya XS < S < M < L)
 */
function compareSizes(a: string, b: string): number {
    // 1. Sayısal ise sayısal karşılaştır
    const numA = parseFloat(a);
    const numB = parseFloat(b);

    if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
    }

    // 2. Standart Bedenler (S, M, L vb.)
    const sizeOrder: Record<string, number> = {
        "XXS": 1, "XS": 2, "S": 3, "M": 4, "L": 5, "XL": 6, "XXL": 7, "2XL": 7, "3XL": 8
    };

    const rankA = sizeOrder[a.toUpperCase()] || 99;
    const rankB = sizeOrder[b.toUpperCase()] || 99;

    if (rankA !== 99 || rankB !== 99) {
        return rankA - rankB;
    }

    // 3. Hiçbiri değilse alfabetik
    return a.localeCompare(b);
}

/**
 * Sistemin o anki durumunun fotoğrafını çeker.
 * Veritabanını yormamak için toplu sorgular kullanır.
 */
async function getSystemState() {
    // Tüm Mağazalar
    const stores = await db.store.findMany();

    // Aktif Modeller ve Varyantları (Stoklarıyla birlikte)
    const models = await db.productModel.findMany({
        where: { isArchived: false },
        include: {
            variants: {
                where: { isArchived: false },
                include: {
                    stocks: true
                }
            }
        }
    });

    // Son 30 Günlük Satışlar (Hız Analizi İçin)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - VELOCITY_DAYS);

    // Prisma'da derin GroupBy zor olduğu için ham veriyi çekip bellekte haritalıyoruz (Map)
    const rawSales = await db.saleItem.findMany({
        where: {
            sale: { createdAt: { gte: pastDate } }
        },
        select: {
            quantity: true,
            variantId: true,
            sale: {
                select: { storeId: true }
            }
        }
    });

    // Harita: "VariantID_StoreID" -> Toplam Satış Adedi
    const salesMap = new Map<string, number>();
    for (const s of rawSales) {
        if (!s.sale?.storeId) continue;
        const key = `${s.variantId}_${s.sale.storeId}`;
        const current = salesMap.get(key) || 0;
        salesMap.set(key, current + s.quantity);
    }

    return { stores, models, salesMap };
}

// --- ESKİ / MANUEL FONKSİYONLAR (GEREKLİ IMPORTLAR İÇİN KORUNDU) ---

export async function generateTransferRecommendations(sourceStoreId: string, targetStoreId: string) {
    if (!sourceStoreId || !targetStoreId || sourceStoreId === targetStoreId) {
        return { success: false, error: "Geçersiz mağaza seçimi" }
    }

    try {
        const potentialItems = await db.productVariant.findMany({
            where: {
                stocks: { some: { storeId: sourceStoreId, quantity: { gt: 2 } } }
            },
            include: { stocks: true, model: true }
        }) as any[]

        const recommendations: { variantId: string, quantity: number }[] = []

        for (const item of potentialItems) {
            const sourceStock = item.stocks.find((s: any) => s.storeId === sourceStoreId)?.quantity || 0
            const targetStock = item.stocks.find((s: any) => s.storeId === targetStoreId)?.quantity || 0

            if (targetStock === 0 && sourceStock > 2) {
                let qtyToTransfer = Math.floor(sourceStock / 3)
                if (qtyToTransfer < 1) qtyToTransfer = 1
                recommendations.push({ variantId: item.id, quantity: qtyToTransfer })
            }
        }

        if (recommendations.length === 0) {
            return { success: true, count: 0, message: "Önerilecek ürün bulunamadı." }
        }

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
        const count = await db.stockTransfer.count({
            where: {
                createdAt: {
                    gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    lt: new Date(new Date().setHours(23, 59, 59, 999))
                }
            }
        })
        const transferNo = `TRF-${dateStr}-${String(count + 1).padStart(3, '0')}`

        await db.stockTransfer.create({
            data: {
                transferNo,
                sourceStoreId,
                targetStoreId,
                status: "RECOMMENDED",
                note: "Manuel Stok Dengeleme Önerisi",
                items: {
                    create: recommendations.map(r => ({
                        variantId: r.variantId,
                        quantitySent: r.quantity,
                        quantityReceived: 0
                    }))
                }
            }
        })

        revalidatePath("/dashboard/transfers")
        return { success: true, count: recommendations.length, message: `${recommendations.length} ürün için transfer önerisi oluşturuldu.` }

    } catch (error) {
        console.error("Recommendation Error:", error)
        return { success: false, error: "Öneri oluşturulurken hata oluştu." }
    }
}

export async function approveRecommendation(transferId: string) {
    try {
        await db.stockTransfer.update({
            where: { id: transferId },
            data: { status: "PENDING", updatedAt: new Date() }
        })
        revalidatePath("/dashboard/transfers")
        return { success: true, message: "Öneri onaylandı, bekleyen transferlere eklendi." }
    } catch (error) {
        return { success: false, error: "Onaylanırken hata oluştu." }
    }
}

export async function rejectRecommendation(transferId: string) {
    try {
        await db.stockTransfer.delete({ where: { id: transferId } })
        revalidatePath("/dashboard/transfers")
        return { success: true, message: "Öneri silindi." }
    } catch (error) {
        return { success: false, error: "Silinirken hata oluştu." }
    }
}

export async function cancelTransfer(transferId: string) {
    try {
        await db.stockTransfer.update({
            where: { id: transferId },
            data: { status: "CANCELLED", updatedAt: new Date() }
        })
        revalidatePath("/dashboard/transfers")
        return { success: true, message: "Transfer iptal edildi." }
    } catch (error) {
        return { success: false, error: "İptal edilirken hata oluştu." }
    }
}

export async function completeTransfer(transferId: string, verifiedItems: { variantId: string, quantity: number }[]) {
    try {
        const transfer = await db.stockTransfer.findUnique({
            where: { id: transferId },
            include: { items: true }
        })

        if (!transfer) return { success: false, error: "Transfer bulunamadı" }
        if (transfer.status === "COMPLETED") return { success: false, error: "Transfer zaten tamamlanmış" }

        await db.$transaction(async (tx) => {
            for (const item of verifiedItems) {
                // Decrease Source
                await tx.stock.upsert({
                    where: { variantId_storeId: { variantId: item.variantId, storeId: transfer.sourceStoreId } },
                    create: { variantId: item.variantId, storeId: transfer.sourceStoreId, quantity: 0 },
                    update: { quantity: { decrement: item.quantity } }
                })

                // Increase Target
                await tx.stock.upsert({
                    where: { variantId_storeId: { variantId: item.variantId, storeId: transfer.targetStoreId } },
                    create: { variantId: item.variantId, storeId: transfer.targetStoreId, quantity: item.quantity },
                    update: { quantity: { increment: item.quantity } }
                })

                await tx.stockTransferItem.updateMany({
                    where: { transferId: transfer.id, variantId: item.variantId },
                    data: { quantitySent: item.quantity, quantityReceived: item.quantity }
                })
            }

            await tx.stockTransfer.update({
                where: { id: transferId },
                data: { status: "COMPLETED", sentAt: new Date(), receivedAt: new Date() }
            })
        })

        revalidatePath("/dashboard/transfers")
        return { success: true, message: "Transfer başarıyla tamamlandı." }

    } catch (error) {
        console.error("Complete Transfer Error:", error)
        return { success: false, error: "Transfer tamamlanırken hata oluştu." }
    }
}

export async function generateOpeningStockRecommendations(newStoreId: string) {
    try {
        const stores = await db.store.findMany({ where: { id: { not: newStoreId } } });
        if (stores.length === 0) return { success: false, error: "Kaynak mağaza bulunamadı." }

        const sourceStore = stores.find(s => s.name.toLowerCase().includes("merkez")) || stores[0];
        return await generateTransferRecommendations(sourceStore.id, newStoreId);
    } catch (error) {
        console.error("Opening Stock Error:", error);
        return { success: false, error: "Açılış önerileri oluşturulamadı." }
    }
}

export async function removeTransferItem(transferId: string, variantId: string) {
    try {
        await db.stockTransferItem.deleteMany({ where: { transferId: transferId, variantId: variantId } });
        revalidatePath("/dashboard/transfers");
        return { success: true };
    } catch (error) {
        console.error("Remove Item Error:", error);
        return { success: false, error: "Ürün silinemedi." };
    }
}

export async function addTransferItems(transferId: string, variantIds: string[]) {
    try {
        const transfer = await db.stockTransfer.findUnique({ where: { id: transferId } });
        if (!transfer) return { success: false, error: "Transfer bulunamadı." };

        for (const vid of variantIds) {
            const existing = await db.stockTransferItem.findFirst({ where: { transferId, variantId: vid } });
            if (existing) {
                if (existing.quantitySent === 0) {
                    await db.stockTransferItem.update({ where: { id: existing.id }, data: { quantitySent: 1 } })
                }
            } else {
                await db.stockTransferItem.create({
                    data: { transferId, variantId: vid, quantitySent: 1, quantityReceived: 0 }
                });
            }
        }
        revalidatePath("/dashboard/transfers");
        return { success: true, message: `${variantIds.length} ürün eklendi.` };
    } catch (error) {
        console.error("Add Items Error:", error);
        return { success: false, error: "Ürünler eklenemedi." };
    }
}

export async function searchProductsForTransfer(query: string) {
    if (!query || query.length < 2) return [];

    try {
        const products = await db.productModel.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { modelCode: { contains: query } },
                    { variants: { some: { barcode: { contains: query } } } }
                ]
            },
            include: { variants: { include: { stocks: true } } },
            take: 10
        });

        const results: any[] = [];
        products.forEach(p => {
            p.variants.forEach(v => {
                results.push({
                    id: v.id,
                    name: `${p.name} - ${v.color} - ${v.size}`,
                    sku: v.sku,
                    barcode: v.barcode,
                    stockTotal: v.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0),
                    modelName: p.name
                });
            });
        });

        return results;

    } catch (error) {
        console.error("Search Error:", error);
        return [];
    }
}
