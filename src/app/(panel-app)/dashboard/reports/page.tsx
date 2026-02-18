"use client"

import * as React from "react"
import { format, subDays, startOfMonth, startOfWeek } from "date-fns"
import { tr } from "date-fns/locale"
import { Calendar as CalendarIcon, Store as StoreIcon, TrendingUp, TrendingDown, DollarSign, ShoppingBag } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getStores } from "@/actions/settings/store-actions"
import { getSalesReport, ReportSummary, ChartData } from "@/actions/settings/report-actions"
import { toast } from "sonner"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    AreaChart,
    ComposedChart,
    Line
} from "recharts"

export default function ReportsPage() {
    const [date, setDate] = React.useState<Date | undefined>(new Date())
    const [dateRange, setDateRange] = React.useState<{ from: Date, to: Date }>({
        from: startOfMonth(new Date()),
        to: new Date()
    })
    const [storeId, setStoreId] = React.useState("all")
    const [stores, setStores] = React.useState<{ id: string, name: string }[]>([])

    const [loading, setLoading] = React.useState(true)
    const [summary, setSummary] = React.useState<ReportSummary | null>(null)
    const [chartData, setChartData] = React.useState<ChartData[]>([])

    // Load Stores on mount
    React.useEffect(() => {
        getStores().then(res => {
            if (res.success && res.stores) setStores(res.stores);
        });
    }, []);

    // Load Report Data
    React.useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const res = await getSalesReport(
                    dateRange.from.toISOString(),
                    dateRange.to.toISOString(),
                    storeId
                );
                setSummary(res.summary);
                setChartData(res.chartData);
            } catch (error) {
                toast.error("Rapor alınamadı.");
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [dateRange, storeId]);


    // Date Presets
    const setPreset = (type: 'today' | 'yesterday' | 'week' | 'month') => {
        const today = new Date();
        if (type === 'today') setDateRange({ from: today, to: today });
        else if (type === 'yesterday') {
            const y = subDays(today, 1);
            setDateRange({ from: y, to: y });
        } else if (type === 'week') {
            setDateRange({ from: startOfWeek(today, { weekStartsOn: 1 }), to: today });
        } else if (type === 'month') {
            setDateRange({ from: startOfMonth(today), to: today });
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Raporlar</h2>
                <div className="flex items-center space-x-2">
                    {/* Store Filter */}
                    <Select value={storeId} onValueChange={setStoreId}>
                        <SelectTrigger className="w-[180px]">
                            <StoreIcon className="mr-2 h-4 w-4" />
                            <SelectValue placeholder="Tüm Mağazalar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tüm Mağazalar</SelectItem>
                            {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    {/* Date Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "d MMM", { locale: tr })} -{" "}
                                            {format(dateRange.to, "d MMM", { locale: tr })}
                                        </>
                                    ) : (
                                        format(dateRange.from, "PPP", { locale: tr })
                                    )
                                ) : (
                                    <span>Tarih Seç</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <div className="p-2 border-b flex gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setPreset('today')}>Bugün</Button>
                                <Button size="sm" variant="ghost" onClick={() => setPreset('yesterday')}>Dün</Button>
                                <Button size="sm" variant="ghost" onClick={() => setPreset('week')}>Bu Hafta</Button>
                                <Button size="sm" variant="ghost" onClick={() => setPreset('month')}>Bu Ay</Button>
                            </div>
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={(range: any) => {
                                    if (range?.from) setDateRange({ from: range.from, to: range.to || range.from })
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Toplam Ciro</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{summary ? formatCurrency(summary.totalRevenue) : "-"}</div>
                        <p className="text-xs text-muted-foreground">Seçili dönemdeki toplam satış</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Kar</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{summary ? formatCurrency(summary.totalProfit) : "-"}</div>
                        <p className="text-xs text-muted-foreground">Ciro - Maliyet</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">İşlem Sayısı</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary ? summary.totalSalesCount : "-"}</div>
                        <p className="text-xs text-muted-foreground">Toplam fiş/fatura sayısı</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ort. Sepet</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary ? formatCurrency(summary.averageBasket) : "-"}</div>
                        <p className="text-xs text-muted-foreground">İşlem başına ortalama tutar</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-1">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Satış Grafiği</CardTitle>
                        <CardDescription>Günlük ciro ve kar dağılımı</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px]">
                            {loading ? (
                                <div className="h-full flex items-center justify-center text-muted-foreground">Yükleniyor...</div>
                            ) : chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(value) => format(new Date(value), 'd MMM', { locale: tr })}
                                            fontSize={12}
                                            stroke="#888888"
                                        />
                                        <YAxis
                                            tickFormatter={(value) => `₺${value}`}
                                            fontSize={12}
                                            stroke="#888888"
                                        />
                                        <Tooltip
                                            formatter={(value: any) => formatCurrency(value)}
                                            labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy', { locale: tr })}
                                        />
                                        <Legend />
                                        <Bar dataKey="revenue" name="Ciro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="profit" name="Kar" stroke="#22c55e" strokeWidth={2} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground">Bu dönemde veri yok.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
