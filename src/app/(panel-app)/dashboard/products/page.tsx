import { prisma } from "@/lib/db";
import { ProductGrid } from "@/components/products/product-grid-view";
import { ProductActions } from "@/components/products/product-actions";
import { getProductsWithFilters, getFilterFacets } from "@/actions/inventory/product-query-actions";

type SearchParams = {
    page?: string;
    search?: string;
    brand?: string | string[];
    category?: string | string[];
    season?: string | string[];
    material?: string | string[];
    status?: string; // "active" or "archived"
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {

    const resolvedParams = await searchParams;

    // Parse params
    const page = 1;
    const limit = 1000000; // Unlimited Mode

    const brands = typeof resolvedParams.brand === 'string' ? [resolvedParams.brand] : resolvedParams.brand;
    const categories = typeof resolvedParams.category === 'string' ? [resolvedParams.category] : resolvedParams.category;
    const seasons = typeof resolvedParams.season === 'string' ? [resolvedParams.season] : resolvedParams.season;
    const materials = typeof resolvedParams.material === 'string' ? [resolvedParams.material] : resolvedParams.material;

    // Fetch Data
    const { data: products, metadata } = await getProductsWithFilters({
        page,
        limit,
        search: resolvedParams.search,
        brand: brands,
        category: categories,
        season: seasons,
        material: materials,
        showArchived: resolvedParams.status === "archived"
    });

    const rawFacets = await getFilterFacets();

    // Map Facets for Grid Component
    const facets = {
        brands: rawFacets.brands.map(b => ({ value: b, count: 0, checked: false })),
        categories: rawFacets.categories.map(c => ({ value: c, count: 0, checked: false })),
        seasons: rawFacets.seasons.map(s => ({ value: s, count: 0, checked: false }))
    }

    const stores = await prisma.store.findMany({
        select: { id: true, name: true }
    });

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
            {/* Full Width Grid Content directly - maximizing space */}
            <div className="flex-1 min-w-0 p-1">
                <ProductGrid
                    products={products as any}
                    stores={stores}
                    facets={facets as any}
                    totalCount={metadata?.total || 0} // Passing total count
                />
            </div>
        </div>
    );
}
