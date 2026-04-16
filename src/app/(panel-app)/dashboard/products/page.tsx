import { db } from "@/lib/db";
import { ProductListClient } from "@/components/products/product-list-client";
import { getProductsWithFilters, getFilterFacets } from "@/actions/inventory/product-query-actions";

type SearchParams = {
    page?: string;
    search?: string;
    brand?: string | string[];
    category?: string | string[];
    seasonType?: string | string[];
    seasonYear?: string | string[];
    subCategory?: string | string[];
    status?: string; // "active" or "archived"
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {

    const resolvedParams = await searchParams;

    // Parse params
    const page = 1;
    const limit = 1000000; // Unlimited Mode

    const brands = typeof resolvedParams.brand === 'string' ? [resolvedParams.brand] : resolvedParams.brand;
    const categories = typeof resolvedParams.category === 'string' ? [resolvedParams.category] : resolvedParams.category;
    const subCategories = typeof resolvedParams.subCategory === 'string' ? [resolvedParams.subCategory] : resolvedParams.subCategory;
    const seasonTypes = typeof resolvedParams.seasonType === 'string' ? [resolvedParams.seasonType] : resolvedParams.seasonType;
    const seasonYears = typeof resolvedParams.seasonYear === 'string' ? [resolvedParams.seasonYear] : resolvedParams.seasonYear;

    // Fetch Data for Initial Load (SSR)
    const { data: products, metadata } = await getProductsWithFilters({
        page,
        limit,
        search: resolvedParams.search,
        brand: brands,
        category: categories,
        subCategory: subCategories,
        seasonType: seasonTypes,
        seasonYear: seasonYears,
        showArchived: resolvedParams.status === "archived"
    });

    const rawFacets = await getFilterFacets();

    // Map Facets for Grid Component
    const facets = {
        brands: rawFacets.brands.map(b => ({ value: b, count: 0, checked: false })),
        categories: rawFacets.categories.map(c => ({ value: c, count: 0, checked: false })),
        subCategories: rawFacets.subCategories.map(s => ({ value: s, count: 0, checked: false })),
        seasonTypes: rawFacets.seasonTypes.map(s => ({ value: s, count: 0, checked: false })),
        seasonYears: rawFacets.seasonYears.map(s => ({ value: s, count: 0, checked: false }))
    }

    const stores = await db.store.findMany({
        select: { id: true, name: true }
    });

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
            <div className="flex-1 min-w-0 p-1">
                {/* SWR Client Wrapper with Fallback Data */}
                <ProductListClient
                    initialProducts={products as any}
                    initialTotal={metadata?.total || 0}
                    stores={stores}
                    facets={facets as any}
                />
            </div>
        </div>
    );
}
