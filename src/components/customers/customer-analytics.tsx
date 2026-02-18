"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Wallet, ShoppingBag, ArrowRightLeft, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export type AnalyticsData = {
    ltv: number
    aov: number
    totalOrders: number
    returnRate: number
    lastVisitDate: Date | null
}

function StatCard({ title, value, subtext, icon: Icon, colorClass }: { title: string, value: string, subtext?: string, icon: any, colorClass: string }) {
    return (
        <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase">{title}</p>
                    <p className="text-2xl font-bold tracking-tight">{value}</p>
                    {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
                </div>
                <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-5 w-5 opacity-80" />
                </div>
            </CardContent>
        </Card>
    )
}

export function CustomerAnalytics({ data }: { data: AnalyticsData }) {
    const daysSinceLastVisit = data.lastVisitDate
        ? Math.floor((new Date().getTime() - data.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
        : null

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Toplam Ciro (LTV)"
                value={formatCurrency(data.ltv)}
                subtext={`${data.totalOrders} İşlem`}
                icon={Wallet}
                colorClass="bg-green-100 text-green-700"
            />
            <StatCard
                title="Ort. Sepet (AOV)"
                value={formatCurrency(data.aov)}
                icon={ShoppingBag}
                colorClass="bg-blue-100 text-blue-700"
            />
            <StatCard
                title="İade Oranı"
                value={`%${data.returnRate.toFixed(1)}`}
                subtext="Ürün Bazlı"
                icon={ArrowRightLeft}
                colorClass="bg-orange-100 text-orange-700"
            />
            <StatCard
                title="Son Ziyaret"
                value={daysSinceLastVisit !== null ? `${daysSinceLastVisit} Gün` : "-"}
                subtext={daysSinceLastVisit !== null ? (daysSinceLastVisit > 30 ? "⚠️ Riskli" : "✅ Aktif") : "Ziyaret Yok"}
                icon={Clock}
                colorClass={daysSinceLastVisit !== null && daysSinceLastVisit > 30 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}
            />
        </div>
    )
}
