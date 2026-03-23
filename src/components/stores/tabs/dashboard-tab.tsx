"use client"

import type { DateRangeType } from '@/types/actions';
﻿import { useEffect, useState } from "react";
import { getStoreDashboardStats } from '@/actions/settings/store-reporting-actions';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowUpRight, CreditCard, DollarSign, ShoppingBag, Users } from "lucide-react";
import { RecentSales } from "@/components/dashboard/recent-sales";

interface DashboardTabProps {
    storeId: string;
    // Note: Dashboard tab is simpler and currently mainly realtime/today, 
    // but we can pass dateRange if we want to make it filterable later.
    // For now, getStoreDashboardStats uses "Today" hardcoded for the summary cards if requested,
    // but the implementation plan implies it might be reactive.
    // However, the action created `getStoreDashboardStats` is hardcoded to TODAY.
    // So current DateRange Picker won't affect this tab unless we update the action.
    // Decision: Keep it "Live/Today" focused as requested "DASHBOARD (Anlık Durum)".
}

export function DashboardTab({ storeId }: DashboardTabProps) {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const data = await getStoreDashboardStats(storeId);
                setStats(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [storeId]);

    if (loading) {
        return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" />
        </div>;
    }

    if (!stats) return <div>Veri yüklenemedi.</div>;

    return (
        <div className="space-y-8">
            {/* 3-Column Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* 1. Activity (Faaliyet) */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-indigo-500" />
                            Mağaza Faaliyet
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="text-sm text-muted-foreground">Toplam İşlem</span>
                                <span className="font-bold text-lg">{stats.dashboardSummary.todaySalesCount}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                                    <div className="text-xs text-muted-foreground">Satış</div>
                                    <div className="font-bold text-green-600">{stats.dashboardSummary.activityCounts.SALE}</div>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                                    <div className="text-xs text-muted-foreground">Değişim</div>
                                    <div className="font-bold text-orange-600">{stats.dashboardSummary.activityCounts.EXCHANGE}</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                                    <div className="text-xs text-muted-foreground">İade</div>
                                    <div className="font-bold text-red-600">{stats.dashboardSummary.activityCounts.RETURN}</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Finance (Kasa & Mali) */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-500" />
                            Kasa & Mali
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm">Toplam Ciro</span>
                                <span className="font-bold text-lg text-green-600">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.dashboardSummary.todayRevenue)}
                                </span>
                            </div>
                            <div className="space-y-1 pt-2 border-t text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Nakit</span>
                                    <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.dashboardSummary.financeStats.CASH)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Kredi Kartı</span>
                                    <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.dashboardSummary.financeStats.CREDIT_CARD)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Hediye Çeki</span>
                                    <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.dashboardSummary.financeStats.GIFT_CARD)}</span>
                                </div>
                            </div>
                            <div className="pt-2 border-t mt-2 flex justify-between items-center text-sm text-red-500">
                                <span>Giderler</span>
                                <span>-{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(stats.dashboardSummary.todayExpense)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Staff (Personel) */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            Personel (Günlük)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 pt-1">
                            {stats.dashboardSummary.staffStats.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Satış yok.</p>
                            ) : (
                                stats.dashboardSummary.staffStats.map((s: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-gray-100 w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold text-gray-600">{idx + 1}</span>
                                            <span>{s.name}</span>
                                        </div>
                                        <span className="font-medium">
                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(s.total)}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
