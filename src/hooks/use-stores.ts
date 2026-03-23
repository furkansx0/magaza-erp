import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useStores(fallbackData?: any) {
    const { data, error, isLoading, mutate } = useSWR("/api/stores", fetcher, {
        fallbackData,
        revalidateOnFocus: false,
        dedupingInterval: 10000,
    });

    return {
        stores: data?.data || [],
        isLoading: !data && !error,
        isError: error,
        mutate
    };
}
