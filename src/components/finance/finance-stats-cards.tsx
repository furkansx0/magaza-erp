import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowUpRight, Calendar, CreditCard, AlertTriangle, TrendingUp } from "lucide-react"
import { FinanceStats } from "@/types/finance"
import { cn } from "@/lib/utils"

export function FinanceStatsCards({ stats }: { stats: FinanceStats }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* TOTAL DEBT */}
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Borç</CardTitle>
                    <CreditCard className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                    <p className="text-xs text-muted-foreground mt-1">Tüm tedarikçi bakiyeleri</p>
                </CardContent>
            </Card>

            {/* OVERDUE */}
            <Card className={cn("border-l-4 border-l-red-500 shadow-sm", stats.overdueDebt > 0 && "bg-red-50/20")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-600">Vadesi Geçmiş</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-700">{stats.overdueDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                    <p className="text-xs text-red-400 mt-1">Acil ödeme bekleyenler</p>
                </CardContent>
            </Card>

            {/* UPCOMING */}
            <Card className="border-l-4 border-l-yellow-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Gelecek Ay Ödenecek</CardTitle>
                    <Calendar className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.upcomingDebt.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                    <p className="text-xs text-muted-foreground mt-1">30 gün içinde vadesi gelenler</p>
                </CardContent>
            </Card>

            {/* TOP DEBTOR */}
            <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">En Yüksek Borçlu</CardTitle>
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold truncate" title={stats.topDebtor?.name || "-"}>
                        {stats.topDebtor ? stats.topDebtor.name : "-"}
                    </div>
                    <p className="text-xs text-indigo-600 mt-1 font-medium">
                        {stats.topDebtor ? stats.topDebtor.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : "Borç yok"}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
