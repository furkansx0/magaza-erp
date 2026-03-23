import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export type ProductFilters = {
    page?: number;
    limit?: number;
    search?: string;
    brand?: string[];
    category?: string[];
    season?: string[];
    material?: string[];
    status?: string;
};

export function useProducts(filters: ProductFilters, fallbackData?: any) {
    const query = new URLSearchParams();
    if (filters.page) query.set("page", filters.page.toString());
    if (filters.limit) query.set("limit", filters.limit.toString());
    if (filters.search) query.set("search", filters.search);
    if (filters.status) query.set("status", filters.status);
    
    filters.brand?.forEach(b => query.append("brand", b));
    filters.category?.forEach(c => query.append("category", c));
    filters.season?.forEach(s => query.append("season", s));
    filters.material?.forEach(m => query.append("material", m));

    const key = `/api/products?${query.toString()}`;

    const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
        fallbackData,
        revalidateOnFocus: false,
        dedupingInterval: 5000, // 5 seconds
    });

    return {
        products: data?.data || [],
        metadata: data?.metadata,
        isLoading,
        isError: error,
        mutate
    };
}
