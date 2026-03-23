"use client"

import type { DateRangeType } from '@/types/actions';
﻿import { useEffect, useState } from "react";
import { getStoreFinanceReport } from '@/actions/settings/store-reporting-actions';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface FinanceTabProps {
    storeId: string;
    dateRange: {
        range: DateRangeType;
        customStart?: Date;
        customEnd?: Date;
    };
}

export function FinanceTab({ storeId, dateRange }: FinanceTabProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const res = await getStoreFinanceReport(storeId, dateRange);
                setData(res);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [storeId, dateRange]);

    if (loading) {
        return <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
        </div>;
    }

    if (!data) return <div>Data error.</div>;

    return (
        <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Toplam Tahsilat</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.summary.totalIncome)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">Toplam Gider</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.summary.totalExpense)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">Nakit Giriş</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.summary.cashIncome)}
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-slate-100 border-slate-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-700">Nakit Kalan (Devir Hariç)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.summary.netCash)}
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-none mt-1">Nakit Satış - Giderler</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Payment Methods */}
                <Card>
                    <CardHeader>
                        <CardTitle>Ödeme Yöntemi Dağılımı</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span>Nakit</span>
                                <span className="font-bold">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.paymentBreakdown.cash)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span>Kredi Kartı</span>
                                <span className="font-bold">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.paymentBreakdown.creditCard)}</span>
                            </div>
                            <div className="flex justify-between items-center border-b pb-2">
                                <span>Hediye Çeki</span>
                                <span className="font-bold">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.paymentBreakdown.giftCard)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Gider Listesi (Kasa Çıkışları)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.expenses.length === 0 ? (
                            <div className="text-muted-foreground text-sm">Bu aralıkta gider kaydı yok.</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tarih</TableHead>
                                        <TableHead>Açıklama</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.expenses.map((e: any) => (
                                        <TableRow key={e.id}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {format(new Date(e.createdAt), "dd MMM HH:mm", { locale: tr })}
                                            </TableCell>
                                            <TableCell>{e.description}</TableCell>
                                            <TableCell className="text-right font-medium text-red-600">
                                                -{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(e.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
