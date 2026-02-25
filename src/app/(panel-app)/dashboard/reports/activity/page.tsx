"use client"

import * as React from "react"
import { format, startOfDay, endOfDay } from "date-fns"
import { tr } from "date-fns/locale"
import * as XLSX from "xlsx"
import { Calendar as CalendarIcon, Store as StoreIcon, Download, FileText, Search } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ErpDateRangePicker } from "@/components/ui/erp-date-range-picker"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table"
import { getStores } from "@/actions/settings/store-actions"
import { getActivityReport, ActivityRow } from "@/actions/settings/activity-actions"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

export default function ActivityReportPage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    const [dateRange, setDateRange] = React.useState<{ from: Date, to: Date }>({
        from: startOfDay(new Date()),
        to: endOfDay(new Date())
    })
    const [storeId, setStoreId] = React.useState("all")
    const [stores, setStores] = React.useState<{ id: string, name: string }[]>([])

    const [loading, setLoading] = React.useState(true)
    const [rows, setRows] = React.useState<ActivityRow[]>([])
    const [stats, setStats] = React.useState({ total: 0, cash: 0, credit: 0, gift: 0 })
    const [searchTerm, setSearchTerm] = React.useState("")

    // Load Stores on mount
    React.useEffect(() => {
        getStores().then(res => {
            if (res && Array.isArray(res)) setStores(res);
        });
    }, []);

    // Load Report Data
    React.useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const res = await getActivityReport(
                    dateRange.from.toISOString(),
                    dateRange.to.toISOString(),
                    storeId
                );
                setRows(res.rows);
                setStats(res.stats);
            } catch (error) {
                toast.error("Rapor alınamadı.");
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [dateRange, storeId]);

    // Client-side Filter
    const filteredRows = React.useMemo(() => {
        if (!searchTerm) return rows;
        const lower = searchTerm.toLowerCase();
        return rows.filter(r =>
            r.docNo.toLowerCase().includes(lower) ||
            r.description.toLowerCase().includes(lower) ||
            r.staff.toLowerCase().includes(lower)
        );
    }, [rows, searchTerm]);

    // Excel Export
    const handleExport = () => {
        if (filteredRows.length === 0) return toast.error("Aktarılacak veri yok");

        const exportData = filteredRows.map(r => ({
            "Tarih": r.date,
            "Saat": r.time,
            "İşlem Tipi": r.type,
            "Belge No": r.docNo,
            "Açıklama": r.description,
            "Personel": r.staff,
            "Tutar": r.total,
            "Nakit": r.cash,
            "Kredi Kartı": r.creditCard,
            "Hediye Çeki": r.giftCard
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Faaliyet_Raporu");

        // Auto width
        const wscols = Object.keys(exportData[0]).map(k => ({ wch: 15 }));
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `Magaza_Faaliyet_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 h-full flex flex-col">
            <div className="flex items-center justify-between space-y-2 shrink-0">
                <h2 className="text-3xl font-bold tracking-tight">Mağaza Faaliyet Raporu</h2>
                <div className="flex items-center space-x-2">
                    {/* Store Filter */}
                    <Select value={storeId} onValueChange={setStoreId}>
                        <SelectTrigger className="w-[180px] h-9">
                            <StoreIcon className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Tüm Mağazalar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Mağazalar</SelectItem>
                            {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Date Picker */}
                    <ErpDateRangePicker
                        date={dateRange}
                        onDateChange={(range) => {
                            if (range?.from) setDateRange({ from: range.from, to: range.to || range.from })
                        }}
                        revenue={{
                            amount: stats.total || 0,
                            currency: "₺",
                            growthPercentage: 0,
                            isPositive: true
                        }}
                    />

                    <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
                        <Download className="mr-2 h-4 w-4" /> Excel
                    </Button>
                </div>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b flex gap-4 items-center bg-gray-50/50 shrink-0">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Belge No, Personel veya Açıklama ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 h-9"
                        />
                    </div>
                    <div className="ml-auto text-sm text-muted-foreground">
                        Toplam <strong>{filteredRows.length}</strong> kayıt
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                            <TableRow>
                                <TableHead className="w-[100px]">İşlem Tipi</TableHead>
                                <TableHead className="w-[120px]">Belge No</TableHead>
                                <TableHead>Açıklama</TableHead>
                                <TableHead>Personel</TableHead>
                                <TableHead className="text-right">Tutar</TableHead>
                                <TableHead className="text-right text-green-600">Nakit</TableHead>
                                <TableHead className="text-right text-indigo-600">Kredi Kartı</TableHead>
                                <TableHead className="text-right text-orange-600">Hediye Çeki</TableHead>
                                <TableHead className="text-right w-[120px]">Tarih</TableHead>
                                <TableHead className="text-right w-[80px]">Saat</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">Yükleniyor...</TableCell>
                                </TableRow>
                            ) : filteredRows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="h-24 text-center">Kayıt bulunamadı.</TableCell>
                                </TableRow>
                            ) : (
                                filteredRows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium">{row.type}</TableCell>
                                        <TableCell className="font-mono text-xs">{row.docNo}</TableCell>
                                        <TableCell>{row.description}</TableCell>
                                        <TableCell>{row.staff}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(row.total)}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{row.cash > 0 ? formatCurrency(row.cash) : "-"}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{row.creditCard > 0 ? formatCurrency(row.creditCard) : "-"}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">{row.giftCard > 0 ? formatCurrency(row.giftCard) : "-"}</TableCell>
                                        <TableCell className="text-right text-xs">{row.date}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">{row.time}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        <TableFooter className="sticky bottom-0 bg-gray-100 z-10 font-bold border-t">
                            <TableRow>
                                <TableCell colSpan={4}>TOPLAM</TableCell>
                                <TableCell className="text-right">{formatCurrency(stats.total)}</TableCell>
                                <TableCell className="text-right text-green-700">{formatCurrency(stats.cash)}</TableCell>
                                <TableCell className="text-right text-indigo-700">{formatCurrency(stats.credit)}</TableCell>
                                <TableCell className="text-right text-orange-700">{formatCurrency(stats.gift)}</TableCell>
                                <TableCell colSpan={2}></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </Card>
        </div>
    )
}
