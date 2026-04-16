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
    seasonType?: string[]; // Yazlık, Kışlık, 4 Mevsim
    seasonYear?: string[]; // 2024 Yaz, etc.
    material?: string[];
    subCategory?: string[];
    minPrice?: number;
    maxPrice?: number;
    showArchived?: boolean;
}

export async function getProductsWithFilters(params: ProductFilterParams) {
    try {
        const page = params.page || 1;
        const limit = params.limit || 20;
        const skip = (page - 1) * limit;
        const showArchived = params.showArchived || false;

        const where: Prisma.ProductModelWhereInput = {};

        if (showArchived) {
            where.OR = [
                { isArchived: true },
                { colors: { some: { variants: { some: { isArchived: true } } } } }
            ];
        } else {
            where.isArchived = false;
        }

        // Text Search
        if (params.search) {
            where.OR = [
                { name: { contains: params.search, mode: 'insensitive' } },
                { modelCode: { contains: params.search, mode: 'insensitive' } },
                {
                    colors: {
                        some: {
                            OR: [
                                { name: { contains: params.search, mode: 'insensitive' } },
                                {
                                    variants: {
                                        some: {
                                            OR: [
                                                { barcode: { contains: params.search } },
                                                { sku: { contains: params.search, mode: 'insensitive' } }
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            ];
        }

        // Filters
        if (params.brand && params.brand.length > 0) where.brand = { in: params.brand };
        if (params.category && params.category.length > 0) where.category = { in: params.category };
        if (params.subCategory && params.subCategory.length > 0) where.subCategory = { in: params.subCategory };
        if (params.gender && params.gender.length > 0) where.gender = { in: params.gender };
        if (params.seasonType && params.seasonType.length > 0) where.seasonType = { in: params.seasonType };
        if (params.seasonYear && params.seasonYear.length > 0) where.seasonYear = { in: params.seasonYear };

        // Price Filter
        if (params.minPrice !== undefined || params.maxPrice !== undefined) {
            where.colors = {
                some: {
                    variants: {
                        some: {
                            salePrice: { gte: params.minPrice, lte: params.maxPrice }
                        }
                    }
                }
            };
        }

        const [products, total] = await Promise.all([
            db.productModel.findMany({
                where,
                include: {
                    colors: {
                        include: {
                            variants: {
                                where: { isArchived: showArchived },
                                include: {
                                    stocks: {
                                        select: { storeId: true, quantity: true }
                                    }
                                }
                            }
                        }
                    }
                },
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' }
            }),
            db.productModel.count({ where })
        ]);

        // Transform Decimals
        const serializedProducts = products.map(product => ({
            ...product,
            colors: product.colors.map(color => ({
                ...color,
                variants: color.variants.map(v => ({
                    ...v,
                    purchasePrice: Number(v.purchasePrice),
                    salePrice: Number(v.salePrice),
                    secondPrice: v.secondPrice ? Number(v.secondPrice) : null
                }))
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
        const [brands, categories, seasonTypes, seasonYears, subCategories] = await Promise.all([
            db.productModel.findMany({
                select: { brand: true },
                distinct: ['brand'],
                where: { isArchived: false, brand: { not: null } },
                take: 500
            }),
            db.productModel.findMany({
                select: { category: true },
                distinct: ['category'],
                where: { isArchived: false, category: { not: null } },
                take: 500
            }),
            db.productModel.findMany({
                select: { seasonType: true },
                distinct: ['seasonType'],
                where: { isArchived: false, seasonType: { not: null } },
                take: 500
            }),
            db.productModel.findMany({
                select: { seasonYear: true },
                distinct: ['seasonYear'],
                where: { isArchived: false, seasonYear: { not: null } },
                take: 500
            }),
            db.productModel.findMany({
                select: { subCategory: true },
                distinct: ['subCategory'],
                where: { isArchived: false, subCategory: { not: null } },
                take: 500
            })
        ]);

        return {
            brands: brands.map(b => b.brand).filter(Boolean),
            categories: categories.map(c => c.category).filter(Boolean),
            seasonTypes: seasonTypes.map(s => s.seasonType).filter(Boolean),
            seasonYears: seasonYears.map(s => s.seasonYear).filter(Boolean),
            subCategories: subCategories.map(s => s.subCategory).filter(Boolean),
        };
    } catch (error) {
        return { brands: [], categories: [], seasonTypes: [], seasonYears: [], subCategories: [] };
    }
}
