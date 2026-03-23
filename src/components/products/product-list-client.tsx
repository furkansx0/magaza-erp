"use client"

import { ProductGrid } from "./product-grid-view";
import { useProducts } from "@/hooks/use-products";
import { ProductWithVariants } from "@/types/actions";

interface ProductListClientProps {
    initialProducts: ProductWithVariants[];
    initialTotal: number;
    stores: { id: string, name: string }[];
    facets: any;
}

export function ProductListClient({ 
    initialProducts, 
    initialTotal, 
    stores, 
    facets 
}: ProductListClientProps) {
    // SWR Hook with fallback data from server
    const { products, metadata, isLoading } = useProducts(
        { limit: 1000000 }, // Fetch everything for client-side filtering like before
        { data: initialProducts, metadata: { total: initialTotal } }
    );

    return (
        <ProductGrid
            products={products}
            stores={stores}
            facets={facets}
            totalCount={metadata?.total || initialTotal}
        />
    );
}
