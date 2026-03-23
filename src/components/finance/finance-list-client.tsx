"use client"

import { Suspense } from "react";
import { useFinance } from "@/hooks/use-finance";
import { FinanceStatsCards } from "./finance-stats-cards";
import { SupplierList } from "./supplier-list";

interface FinanceListClientProps {
    initialData: {
        stats: any;
        suppliers: any[];
    };
}

export function FinanceListClient({ initialData }: FinanceListClientProps) {
    const { stats, suppliers, isLoading } = useFinance({ data: initialData });

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <FinanceStatsCards stats={stats} />

            {/* Supplier List */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">Tedarikçi Listesi</h2>
                <Suspense fallback={<div className="p-8 text-center">Yükleniyor...</div>}>
                    <SupplierList data={suppliers} />
                </Suspense>
            </div>
        </div>
    );
}
