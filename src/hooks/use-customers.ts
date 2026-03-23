import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useCustomers(fallbackData?: any) {
    const { data, error, isLoading, mutate } = useSWR("/api/customers", fetcher, {
        fallbackData,
        revalidateOnFocus: false,
        dedupingInterval: 10000, // 10 seconds
    });

    return {
        customers: data?.data || [],
        isLoading: !data && !error,
        isError: error,
        mutate
    };
}
