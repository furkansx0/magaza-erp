import { Suspense } from "react"
import { getFinanceStats, getSuppliers } from "@/actions/finance/finance-actions"
import { FinanceStatsCards } from "@/components/finance/finance-stats-cards"
import { SupplierList } from "@/components/finance/supplier-list"
import { AddSupplierDialog } from "@/components/finance/add-supplier-dialog"
import { Coins } from "lucide-react"

export const dynamic = 'force-dynamic'

export default async function FinancePage() {
    const stats = await getFinanceStats();
    const suppliers = await getSuppliers();

    return (
        <div className="h-full w-full p-6 space-y-6 bg-gray-50/50 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Coins className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Finans ve Cari Takip</h1>
                        <p className="text-sm text-gray-500">Tedarikçi borç ve ödeme yönetim paneli.</p>
                    </div>
                </div>
                <AddSupplierDialog />
            </div>

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
    )
}
