"use client"

import type { DateRangeType } from '@/types/actions';
import { useEffect, useState } from "react";
import { getStoreActivityReport } from '@/actions/settings/store-reporting-actions';
import type { ActivityTypeFilter } from '@/types/actions';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Search } from "lucide-react";
import { SaleDetailDialog } from "@/components/dashboard/sale-detail-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ActivityTabProps {
    storeId: string;
    dateRange: {
        range: DateRangeType;
        customStart?: Date;
        customEnd?: Date;
    };
}

export function ActivityTab({ storeId, dateRange }: ActivityTabProps) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<ActivityTypeFilter>("ALL");
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                // Wait for Date objects to be stable if custom, but client side is fine
                const data = await getStoreActivityReport(storeId, dateRange, filter);
                setTransactions(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [storeId, dateRange, filter]);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <Select value={filter} onValueChange={(val) => setFilter(val as ActivityTypeFilter)}>
                    <SelectTrigger className="w-[180px] bg-white">
                        <SelectValue placeholder="İşlem Tipi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Tüm İşlemler</SelectItem>
                        <SelectItem value="SALE">Satış</SelectItem>
                        <SelectItem value="EXCHANGE">Değişim</SelectItem>
                        {/* <SelectItem value="RETURN">İade</SelectItem> REMOVED as per user request */}
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tarih</TableHead>
                                {/* <TableHead>İşlem No</TableHead> REMOVED */}
                                {/* <TableHead>Personel</TableHead> REMOVED as per user request */}
                                <TableHead>Tip</TableHead>
                                <TableHead className="text-right">Tutar</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Bu tarih aralığında işlem bulunamadı.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((t) => (
                                    <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTransaction(t)}>
                                        <TableCell>{format(new Date(t.createdAt), "dd MMM HH:mm", { locale: tr })}</TableCell>
                                        {/* <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}</TableCell> REMOVED */}
                                        {/* <TableCell>{t.cashierName}</TableCell> REMOVED */}
                                        <TableCell>
                                            <Badge variant={t.type === 'RETURN' ? 'destructive' : t.type === 'EXCHANGE' ? 'outline' : 'default'}
                                                className={t.type === 'EXCHANGE' ? 'border-orange-500 text-orange-600 bg-orange-50' : ''}>
                                                {t.type === 'RETURN' ? 'İADE' : t.type === 'EXCHANGE' ? 'DEĞİŞİM' : 'SATIŞ'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(t.totalAmount)}
                                        </TableCell>
                                        <TableCell>
                                            <Search className="h-4 w-4 text-muted-foreground opacity-50" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <SaleDetailDialog
                sale={selectedTransaction}
                open={!!selectedTransaction}
                onOpenChange={(open) => !open && setSelectedTransaction(null)}
            />
        </div>
    );
}
