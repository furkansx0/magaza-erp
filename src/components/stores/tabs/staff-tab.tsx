"use client"

import { useEffect, useState } from "react";
import { DateRangeType, getStoreStaffReport } from "@/actions/settings/store-reporting-actions";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StaffSalesHistoryDialog } from "./staff-sales-dialog";

interface StaffTabProps {
    storeId: string;
    dateRange: {
        range: DateRangeType;
        customStart?: Date;
        customEnd?: Date;
    };
}

export function StaffTab({ storeId, dateRange }: StaffTabProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStaff, setSelectedStaff] = useState<any>(null); // New State

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const res = await getStoreStaffReport(storeId, dateRange);
                setData(res);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [storeId, dateRange]);

    if (loading) return <Skeleton className="h-64" />;

    return (
        <Card>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Personel</TableHead>
                            <TableHead>Rol / Durum</TableHead>
                            <TableHead className="text-right">Toplam Satış Tutarı</TableHead>
                            <TableHead className="text-right">İşlem Sayısı</TableHead>
                            <TableHead className="text-right">Ürün Adedi</TableHead>
                            <TableHead className="text-right">Ort. Sepet</TableHead>
                            <TableHead className="text-right">Değişim/İade</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Veri bulunamadı.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((s) => (
                                <TableRow
                                    key={s.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedStaff(s)} // Open Dialog
                                >
                                    <TableCell className="font-medium">
                                        <div>{s.name}</div>
                                        {/* <div className="text-xs text-muted-foreground">@{s.username}</div> REMOVED per user request */}
                                    </TableCell>
                                    <TableCell>
                                        {s.isArchived ? (
                                            <Badge variant="secondary" className="text-xs">Arşivlenmiş</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">Aktif</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(s.totalSales)}
                                    </TableCell>
                                    <TableCell className="text-right">{s.transactionCount}</TableCell>
                                    <TableCell className="text-right">{s.totalItems}</TableCell>
                                    <TableCell className="text-right font-mono text-muted-foreground">
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(s.averageBasket)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {s.exchangeCount > 0 ? (
                                            <span className="text-orange-600 font-medium">{s.exchangeCount} İşlem</span>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>

            <StaffSalesHistoryDialog
                open={!!selectedStaff}
                onOpenChange={(open) => !open && setSelectedStaff(null)}
                storeId={storeId}
                staff={selectedStaff}
                dateRange={dateRange}
            />
        </Card>
    );
}
