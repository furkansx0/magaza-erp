import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useFinance(fallbackData?: any) {
    const { data, error, isLoading, mutate } = useSWR("/api/finance", fetcher, {
        fallbackData,
        revalidateOnFocus: false,
        dedupingInterval: 10000,
    });

    return {
        stats: data?.data?.stats || fallbackData?.data?.stats,
        suppliers: data?.data?.suppliers || fallbackData?.data?.suppliers || [],
        isLoading: !data && !error,
        isError: error,
        mutate
    };
}
