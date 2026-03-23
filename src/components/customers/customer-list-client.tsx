"use client"

import { CustomerGridView } from "./customer-grid-view";
import { useCustomers } from "@/hooks/use-customers";

interface CustomerListClientProps {
    initialData: any[];
}

export function CustomerListClient({ initialData }: CustomerListClientProps) {
    const { customers, isLoading } = useCustomers(initialData ? { data: initialData } : undefined);

    return (
        <div className="h-full">
            <CustomerGridView data={customers} />
        </div>
    );
}
