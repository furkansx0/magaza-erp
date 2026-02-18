"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { createAuditLog } from "@/actions/settings/audit-actions";

// Lightweight Product type for POS
export type PosProduct = {
    id: string;
    name: string;
    variantId: string;
    barcode: string;
    sku: string | null;
    price: number;
    stock: number;
    color: string | null;
    size: string | null;
    modelName: string;
    category: string | null;
    brand: string | null;
}

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
                    model: {
                        OR: [
                            { name: { contains: query, mode: 'insensitive' } },
                            { modelCode: { contains: query, mode: 'insensitive' } }
                        ]
                    }
                }
            ],
            model: {
                isArchived: false // STRICTLY ENFORCE NO ARCHIVED MODELS
            }
        },
        include: {
            model: { select: { name: true, category: true, brand: true } },
            stocks: {
                where: {
                    ...(effectiveStoreId ? { storeId: effectiveStoreId } : {})
                },
                select: { storeId: true, quantity: true }
            }
        },
        orderBy: [{ color: 'asc' }, { size: 'asc' }],
        take: 10
    });

    const results = variants.map(v => {
        const totalStock = v.stocks.reduce((acc, s) => acc + s.quantity, 0);
        return {
            id: v.modelId,
            name: v.model.name,
            variantId: v.id,
            barcode: v.barcode,
            sku: v.sku,
            price: Number(v.salePrice),
            stock: totalStock,
            color: v.color,
            size: v.size,
            modelName: v.model.name,
            category: v.model.category,
            brand: v.model.brand
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

export type CartItem = {
    variantId: string;
    quantity: number;
    price: number;
    salesRepId?: string; // Added per-item sales rep
}

export type PaymentInput = {
    method: "CASH" | "CREDIT_CARD" | "GIFT_CARD";
    amount: number;
    referenceCode?: string; // For Gift Card Code
}

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
                            price: item.price,
                            salesRepId: item.salesRepId // Updated
                        }))
                    }
                }
            });

            // C. Update Stocks
            for (const item of data.items) {
                const stockRecord = await tx.stock.findUnique({
                    where: {
                        variantId_storeId: {
                            variantId: item.variantId,
                            storeId: storeId
                        }
                    }
                });

                if (stockRecord) {
                    await tx.stock.update({
                        where: { id: stockRecord.id },
                        data: { quantity: { decrement: item.quantity } }
                    });
                } else {
                    await tx.stock.create({
                        data: {
                            storeId: storeId,
                            variantId: item.variantId,
                            quantity: -item.quantity
                        }
                    });
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
