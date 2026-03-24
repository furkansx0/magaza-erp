import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // 1. Fetch the model with all variants and their sale items
        const model = await db.productModel.findUnique({
            where: { id },
            include: {
                variants: {
                    include: {
                        stocks: {
                            include: { store: { select: { id: true, name: true } } }
                        },
                        saleItems: {
                            include: {
                                sale: {
                                    select: {
                                        id: true,
                                        createdAt: true,
                                        store: { select: { id: true, name: true } },
                                        customer: { select: { id: true, name: true, phone: true } },
                                        cashier: { select: { id: true, name: true, username: true } }
                                    }
                                },
                                salesRep: { select: { id: true, name: true, username: true } }
                            },
                            orderBy: { sale: { createdAt: 'desc' } }
                        }
                    }
                }
            }
        });

        if (!model) {
            return NextResponse.json({ error: "Model bulunamadı" }, { status: 404 });
        }

        // 2. Compute variant-level analytics
        const variantAnalytics = model.variants.map(v => {
            const totalSold = v.saleItems.reduce((acc, si) => acc + si.quantity, 0);
            const totalRevenue = v.saleItems.reduce((acc, si) => acc + (Number(si.finalPrice) * si.quantity), 0);
            const totalProfit = v.saleItems.reduce((acc, si) => acc + ((Number(si.finalPrice) - Number(v.purchasePrice)) * si.quantity), 0);
            const totalStock = v.stocks.reduce((acc, s) => acc + s.quantity, 0);

            // Store-level stock breakdown
            const stockByStore = v.stocks.map(s => ({
                storeId: s.storeId,
                storeName: s.store.name,
                quantity: s.quantity
            }));

            // Store-level sales breakdown
            const salesByStore = new Map<string, { storeName: string; sold: number; revenue: number }>();
            for (const si of v.saleItems) {
                const key = si.sale.store.id;
                const existing = salesByStore.get(key) || { storeName: si.sale.store.name, sold: 0, revenue: 0 };
                existing.sold += si.quantity;
                existing.revenue += Number(si.finalPrice) * si.quantity;
                salesByStore.set(key, existing);
            }

            return {
                id: v.id,
                barcode: v.barcode,
                sku: v.sku,
                color: v.color,
                size: v.size,
                purchasePrice: Number(v.purchasePrice),
                salePrice: Number(v.salePrice),
                totalSold,
                totalRevenue,
                totalProfit,
                totalStock,
                stockByStore,
                salesByStore: Array.from(salesByStore.entries()).map(([storeId, data]) => ({
                    storeId,
                    ...data
                }))
            };
        });

        // 3. Model-level summary
        const totalSold = variantAnalytics.reduce((acc, v) => acc + v.totalSold, 0);
        const totalRevenue = variantAnalytics.reduce((acc, v) => acc + v.totalRevenue, 0);
        const totalProfit = variantAnalytics.reduce((acc, v) => acc + v.totalProfit, 0);
        const totalStock = variantAnalytics.reduce((acc, v) => acc + v.totalStock, 0);

        // Best performing variant by profit
        const bestVariant = variantAnalytics.reduce((best, v) =>
            v.totalProfit > (best?.totalProfit ?? -Infinity) ? v : best, variantAnalytics[0]);

        // 4. Store-level aggregation
        const storeMap = new Map<string, { storeName: string; sold: number; revenue: number; stock: number }>();
        for (const variant of model.variants) {
            // Stock
            for (const s of variant.stocks) {
                const existing = storeMap.get(s.storeId) || { storeName: s.store.name, sold: 0, revenue: 0, stock: 0 };
                existing.stock += s.quantity;
                storeMap.set(s.storeId, existing);
            }
            // Sales
            for (const si of variant.saleItems) {
                const key = si.sale.store.id;
                const existing = storeMap.get(key) || { storeName: si.sale.store.name, sold: 0, revenue: 0, stock: 0 };
                existing.sold += si.quantity;
                existing.revenue += Number(si.finalPrice) * si.quantity;
                storeMap.set(key, existing);
            }
        }

        // 5. Recent sale timeline (last 50 sales across all variants)
        const allSaleItems = model.variants.flatMap(v =>
            v.saleItems.map(si => ({
                saleId: si.sale.id,
                variantId: v.id,
                color: v.color,
                size: v.size,
                barcode: v.barcode,
                originalPrice: Number(si.originalPrice),
                finalPrice: Number(si.finalPrice),
                quantity: si.quantity,
                purchasePrice: Number(v.purchasePrice),
                profit: (Number(si.finalPrice) - Number(v.purchasePrice)) * si.quantity,
                store: si.sale.store,
                customer: si.sale.customer,
                cashier: si.sale.cashier,
                salesRep: si.salesRep,
                createdAt: si.sale.createdAt
            }))
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50);

        return NextResponse.json({
            model: {
                id: model.id,
                name: model.name,
                brand: model.brand,
                category: model.category,
                season: model.season,
                modelCode: model.modelCode
            },
            summary: {
                totalSold,
                totalRevenue,
                totalProfit,
                totalStock,
                bestVariant: bestVariant ? { label: `${bestVariant.color} / ${bestVariant.size}`, profit: bestVariant.totalProfit } : null
            },
            variantAnalytics,
            storeAnalytics: Array.from(storeMap.entries()).map(([storeId, data]) => ({ storeId, ...data })),
            timeline: allSaleItems
        });

    } catch (error: any) {
        console.error("Product analytics error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
