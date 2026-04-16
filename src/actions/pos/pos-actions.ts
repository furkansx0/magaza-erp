"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/actions/settings/audit-actions";

import { PosProduct, CartItem, PaymentInput } from "@/types/pos";
export async function searchPosProducts(query: string, storeId?: string, includeOutOfStock?: boolean): Promise<PosProduct[]> {
    if (!query || query.length < 2) return [];

    const session = await getSession();
    const effectiveStoreId = storeId || session?.storeId;

    const variants = await db.productVariant.findMany({
        where: {
            isArchived: false, // STRICTLY ENFORCE NO ARCHIVED
            OR: [
                { barcode: { equals: query } },
                { sku: { contains: query, mode: 'insensitive' } },
                {
                    color: {
                        model: {
                            OR: [
                                { name: { contains: query, mode: 'insensitive' } },
                                { modelCode: { contains: query, mode: 'insensitive' } }
                            ]
                        }
                    }
                }
            ],
            color: {
                model: {
                    isArchived: false // STRICTLY ENFORCE NO ARCHIVED MODELS
                }
            }
        },
        include: {
            color: {
                include: {
                    model: { select: { id: true, name: true, category: true, brand: true } }
                }
            },
            stocks: {
                where: {
                    ...(effectiveStoreId ? { storeId: effectiveStoreId } : {})
                },
                select: { storeId: true, quantity: true }
            }
        },
        orderBy: [{ color: { name: 'asc' } }, { size: 'asc' }],
        take: 10
    });

    const results = variants.map(v => {
        const totalStock = v.stocks.reduce((acc, s) => acc + s.quantity, 0);
        return {
            id: v.color.model.id,
            name: v.color.model.name,
            variantId: v.id,
            barcode: v.barcode,
            sku: v.sku,
            price: Number(v.salePrice),
            stock: totalStock,
            color: v.color.name,
            size: v.size,
            modelName: v.color.model.name,
            category: v.color.model.category,
            brand: v.color.model.brand
        };
    });

    // If includeOutOfStock is true, return all non-archived results.
    // Otherwise, filter by stock > 0.
    if (includeOutOfStock) {
        return results;
    }

    return results.filter(p => p.stock > 0);
}

export async function getCustomerByPhone(phone: string) {
    if (!phone) return null;
    return await db.customer.findUnique({
        where: { phone },
        include: {
            giftCards: {
                where: {
                    isActive: true,
                    expiryDate: { gt: new Date() },
                    OR: [
                        { type: "FIXED_AMOUNT", remainingBalance: { gt: 0 } },
                        { type: "PERCENTAGE" }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });
}

export async function createDetailedCustomer(data: any) {
    try {
        const customer = await db.customer.create({
            data: {
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                city: data.city || null,
                district: data.district || null,
                type: data.type || "INDIVIDUAL",
                gender: data.gender || null,
                taxNo: data.taxNo || null,
                taxOffice: data.taxOffice || null,
                channel: data.channel || null,
                notes: data.notes || null,
                birthday: data.birthday ? new Date(data.birthday) : null,
                specialDate: data.specialDate ? new Date(data.specialDate) : null,
                specialDateLabel: data.specialDateLabel || null,
                contactPerson: data.contactPerson || null,
                title: data.title || null,
                paymentTerms: data.paymentTerms || null,
                consentSMS: data.consentSMS || false,
                consentEmail: data.consentEmail || false,
            }
        });
        return { success: true, customer };
    } catch (error: any) {
        console.error("Create Customer Error:", error);
        return { success: false, error: error.message || "Bilinmeyen bir hata oluştu" };
    }
}

export async function createQuickCustomer(name: string, phone: string) {
    try {
        const customer = await db.customer.create({
            data: {
                name,
                phone
            }
        });
        return { success: true, customer };
    } catch (error) {
        return { success: false, error: "Müşteri oluşturulamadı. Telefon numarası kayıtlı olabilir." };
    }
}

// --- SALE PROCESSING ---
export async function processSale(data: {
    items: CartItem[];
    payments: PaymentInput[];
    totalAmount: number;
    customerId?: string;
    staffId: string;
    storeId?: string;
}) {
    try {
        if (!data.items || data.items.length === 0) {
            return { success: false, error: "Sepet boş" };
        }

        const paymentsTotal = data.payments.reduce((sum, p) => sum + p.amount, 0);

        if (data.totalAmount >= 0) {
            if (Math.abs(paymentsTotal - data.totalAmount) > 0.01) {
                return { success: false, error: "Ödeme tutarı satış tutarı ile eşleşmiyor." };
            }
        }

        let storeId: string;

        if (data.storeId) {
            storeId = data.storeId;
        } else {
            const cashier = await db.user.findUnique({
                where: { id: data.staffId },
                include: { store: true }
            });

            if (!cashier?.storeId) {
                const defaultStore = await db.store.findFirst();
                if (!defaultStore) return { success: false, error: "Sistemde mağaza tanımlı değil." };
                storeId = defaultStore.id;
            } else {
                storeId = cashier.storeId;
            }
        }

        const result = await db.$transaction(async (tx) => {
            // A. Process Gift Card Deductions
            const giftCardMap = new Map<string, string>();

            for (const p of data.payments) {
                if (p.method === "GIFT_CARD" && p.referenceCode) {
                    const card = await tx.giftCard.findUnique({ where: { code: p.referenceCode } });

                    if (!card) throw new Error(`Hediye çeki bulunamadı: ${p.referenceCode}`);

                    giftCardMap.set(p.referenceCode, card.id);

                    if (data.customerId && card.customerId !== data.customerId) {
                        throw new Error(`Hediye çeki (${p.referenceCode}) bu müşteriye ait değil.`);
                    }
                    if (!card.isActive || new Date() > card.expiryDate) {
                        throw new Error(`Hediye çeki geçersiz: ${p.referenceCode}`);
                    }

                    if (card.type === "FIXED_AMOUNT") {
                        if (Number(card.remainingBalance) < p.amount) {
                            throw new Error(`Hediye çeki bakiyesi yetersiz: ${p.referenceCode}`);
                        }
                        await tx.giftCard.update({
                            where: { id: card.id },
                            data: { remainingBalance: { decrement: p.amount } }
                        });
                    } else if (card.type === "PERCENTAGE") {
                        await tx.giftCard.update({
                            where: { id: card.id },
                            data: {
                                isActive: false,
                                remainingBalance: 0
                            }
                        });
                    }
                }
            }

            // B. Create Sale Record
            const sale = await tx.sale.create({
                data: {
                    storeId: storeId,
                    cashierId: data.staffId,
                    customerId: data.customerId || null,
                    totalAmount: data.totalAmount,
                    paymentMethod: "SPLIT",

                    payments: {
                        create: data.payments.map(p => ({
                            method: p.method,
                            amount: p.amount,
                            giftCardId: (p.method === "GIFT_CARD" && p.referenceCode) ? giftCardMap.get(p.referenceCode) : undefined
                        }))
                    },

                    items: {
                        create: data.items.map(item => ({
                            variantId: item.variantId,
                            quantity: item.quantity,
                            originalPrice: item.originalPrice,
                            finalPrice: item.finalPrice,
                            salesRepId: item.salesRepId // Updated
                        }))
                    }
                }
            });

            // C. Update Stocks — Atomic "compare-and-update" (SELECT FOR UPDATE muadili)
            // Prisma'da $queryRaw ile SELECT FOR UPDATE kullanmak yerine,
            // PostgreSQL'in atomic UPDATE...WHERE quantity >= required desenini kullanıyoruz.
            // Bu yaklaşım: önce oku → kontrol et → güncelle üçlüsündeki race window'u tamamen kapatır.
            for (const item of data.items) {
                // Tek atomik SQL:
                // UPDATE "Stock" SET quantity = quantity - {n}
                // WHERE "variantId" = x AND "storeId" = y AND quantity >= {n}
                // Eğer başka bir kasiyer stoğu tükettiyse, bu UPDATE 0 satır etkiler → hata.
                const affected = await tx.stock.updateMany({
                    where: {
                        variantId: item.variantId,
                        storeId: storeId,
                        quantity: { gte: item.quantity } // ← Kilit şart: yeterli stok varsa güncelle
                    },
                    data: {
                        quantity: { decrement: item.quantity }
                    }
                });

                if (affected.count === 0) {
                    // Güncelleme 0 satır etkiledi: ya kayıt yok ya da stok yetersiz.
                    // Hangisi olduğunu anlamak için mevcut stoku oku (sadece hata mesajı için).
                    const stockRecord = await tx.stock.findUnique({
                        where: { variantId_storeId: { variantId: item.variantId, storeId } },
                        select: { quantity: true }
                    });

                    if (!stockRecord) {
                        throw new Error(
                            `Stok kaydı bulunamadı: Bu ürün mağazada kayıtlı değil. Lütfen stok girişi yapın.`
                        );
                    }
                    throw new Error(
                        `Yetersiz stok: ${item.quantity} adet istendi, mevcut stok ${stockRecord.quantity} adet. ` +
                        `(Başka bir kasiyer bu ürünü satmış olabilir)`
                    );
                }
            }

            return sale;
        });

        // Audit Log
        const formattedTotal = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.totalAmount);
        const methodStr = data.payments.map(p => p.method).join(", ");
        await createAuditLog({
            action: "SALE_CREATE",
            entity: "Sale",
            entityId: result.id,
            details: `Satış yapıldı. Tutar: ${formattedTotal}, Yöntem: ${methodStr}`
        });

        revalidatePath("/pos");
        revalidatePath("/dashboard/products");
        if (data.customerId) revalidatePath("/dashboard/customers");

        return { success: true, saleId: result.id };

    } catch (error: any) {
        console.error("Process Sale Error:", error);
        return { success: false, error: error.message || "Satış işlemi başarısız." };
    }
}
