"use server"

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

type ProductFilterParams = {
    page?: number;
    limit?: number;
    search?: string;
    brand?: string[];
    category?: string[];
    gender?: string[];
    season?: string[];
    material?: string[];
    minPrice?: number;
    maxPrice?: number;
    showArchived?: boolean; // New param
}

type ProductWithVariants = Prisma.ProductModelGetPayload<{
    include: {
        variants: {
            select: {
                id: true
                modelId: true
                color: true
                size: true
                sku: true
                barcode: true
                purchasePrice: true
                salePrice: true
                secondPrice: true
                isArchived: true
                stocks: {
                    select: {
                        storeId: true
                        quantity: true
                    }
                }
            }
        }
    }
}>

export async function getProductsWithFilters(params: ProductFilterParams) {
    try {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const showArchived = params.showArchived || false;

        const where: Prisma.ProductModelWhereInput = {};

        if (showArchived) {
            // If we want archived items, look for models that have ANY archived variants
            // OR models that are themselves archived (which usually implies all variants are archived).
            where.OR = [
                { isArchived: true },
                { variants: { some: { isArchived: true } } }
            ];
        } else {
            // Standard view: Active models only
            where.isArchived = false;
        }

        // Text Search (Name or Variant Barcode/SKU)
        if (params.search) {
            where.OR = [
                { name: { contains: params.search } }, // SQLite is case-insensitive by default in many configs, but usually safe to assume standard contains
                {
                    variants: {
                        some: {
                            OR: [
                                { barcode: { contains: params.search } },
                                { sku: { contains: params.search } }
                            ]
                        }
                    }
                }
            ];
        }

        // Filters
        if (params.brand && params.brand.length > 0) {
            where.brand = { in: params.brand };
        }

        if (params.category && params.category.length > 0) {
            where.category = { in: params.category };
        }

        if (params.gender && params.gender.length > 0) {
            where.gender = { in: params.gender };
        }

        // Dynamic Attributes (JSON Filter)
        // SQLite has limited JSON support in Prisma. We might need raw query or handling it carefully.
        // For now, let's try basic contains for stringified JSON if Prisma doesn't support deep JSON filtering on SQLite easily.
        // OR better: Since we stored attributes as a string field in ProductModel (based on my previous edit),
        // we can use `contains`.
        // Ideally we should use Json type if DB supports it, but I defined it as String? for safety in SQLite.

        if (params.season && params.season.length > 0) {
            where.season = { in: params.season };
        }

        if (params.material && params.material.length > 0) {
            where.material = { in: params.material };
        }

        // Price Filter (Needs to check Variants)
        if (params.minPrice !== undefined || params.maxPrice !== undefined) {
            where.variants = {
                some: {
                    salePrice: {
                        gte: params.minPrice,
                        lte: params.maxPrice
                    }
                }
            };
        }

        const [products, total] = await Promise.all([
            db.productModel.findMany({
                where,
                include: {
                    variants: {
                        where: { isArchived: showArchived },
                        select: {
                            id: true,
                            modelId: true,
                            color: true,
                            size: true,
                            sku: true,
                            barcode: true,
                            purchasePrice: true,
                            salePrice: true,
                            secondPrice: true,
                            isArchived: true,
                            // image: schema'da ProductVariant tablosunda bu alan yok;
                            // görseller ProductImage tablosundan model üzerinden geliyor.
                            stocks: {
                                select: {
                                    storeId: true,
                                    quantity: true
                                }
                            }
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            db.productModel.count({ where })
        ]);

        // Aggregate Metadata for Facets (Facets should ideally come from a cached summary or separate query)
        // For now, we will just return the data. Facets can be fetched separately or derived.

        // Transform Decimal to Number for Client Component Serialization
        const serializedProducts = products.map(product => ({
            ...product,
            variants: product.variants.map(v => ({
                ...v,
                purchasePrice: Number(v.purchasePrice),
                salePrice: Number(v.salePrice),
                secondPrice: v.secondPrice ? Number(v.secondPrice) : null
            }))
        }));

        return {
            success: true,
            data: serializedProducts,
            metadata: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };

    } catch (error) {
        console.error("Get Products Error:", error);
        return { success: false, error: "Ürünler getirilemedi." };
    }
}

export async function getFilterFacets() {
    try {
        const [brands, categories, seasons] = await Promise.all([
            db.productModel.findMany({
                select: { brand: true },
                distinct: ['brand'],
                where: { isArchived: false, brand: { not: null } },
                take: 500 // Facet limiti: 10.000+ ürünlü DB'de tam tablo taramasını önler
            }),
            db.productModel.findMany({
                select: { category: true },
                distinct: ['category'],
                where: { isArchived: false, category: { not: null } },
                take: 500
            }),
            db.productModel.findMany({
                select: { season: true },
                distinct: ['season'],
                where: { isArchived: false, season: { not: null } },
                take: 500
            })
        ]);

        return {
            brands: brands.map(b => b.brand).filter(Boolean),
            categories: categories.map(c => c.category).filter(Boolean),
            seasons: seasons.map(s => s.season).filter(Boolean),
        };
    } catch (error) {
        return { brands: [], categories: [], seasons: [] };
    }
}
