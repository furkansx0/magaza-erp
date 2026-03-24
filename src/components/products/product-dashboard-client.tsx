"use client"

import useSWR from "swr"
import { format, formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import { ArrowLeft, TrendingUp, Package, Star, Store, ShoppingBag, AlertTriangle, CheckCircle, Clock, Tag, ChevronRight } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then(r => r.json());

function fmt(n: number) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
    return (
        <div className={cn("rounded-xl border p-5 flex flex-col gap-3 shadow-sm bg-white dark:bg-gray-900", color)}>
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
                <div className="h-9 w-9 rounded-full bg-white/60 dark:bg-black/20 flex items-center justify-center shadow-sm">
                    <Icon className="h-5 w-5 opacity-80" />
                </div>
            </div>
            <div className="text-3xl font-black tracking-tight">{value}</div>
            {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
        </div>
    );
}

export function ProductDashboardClient({ modelId, modelName }: { modelId: string; modelName: string }) {
    const { data, isLoading, error } = useSWR(`/api/products/${modelId}/analytics`, fetcher, { refreshInterval: 30000 });

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center h-[80vh]">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center animate-pulse">
                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                    </div>
                    <p className="font-medium">Veriler yükleniyor...</p>
                </div>
            </div>
        );
    }

    if (error || !data || data.error) {
        return (
            <div className="flex-1 flex items-center justify-center h-[80vh]">
                <div className="text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-red-400" />
                    <p>Veri yüklenirken hata oluştu.</p>
                </div>
            </div>
        );
    }

    const { model, summary, variantAnalytics, storeAnalytics, timeline } = data;

    // Variant chart data (top 15 by sold)
    const variantChartData = [...variantAnalytics]
        .sort((a: any, b: any) => b.totalSold - a.totalSold)
        .slice(0, 15)
        .map((v: any) => ({
            name: `${v.color ?? "?"} ${v.size ?? ""}`.trim(),
            sold: v.totalSold,
            profit: Math.round(v.totalProfit),
            stock: v.totalStock
        }));

    return (
        <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/products">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Ürünler
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white">{model.name}</h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {model.brand && <Badge variant="secondary">{model.brand}</Badge>}
                        {model.category && <Badge variant="outline">{model.category}</Badge>}
                        {model.season && <Badge variant="outline" className="text-amber-600 border-amber-200">{model.season}</Badge>}
                        {model.modelCode && <span className="text-xs text-muted-foreground font-mono">#{model.modelCode}</span>}
                    </div>
                </div>
            </div>

            {/* ─── Section 1: Financial Summary ───────────────────────────── */}
            <div>
                <h2 className="text-base font-bold text-muted-foreground uppercase tracking-wider mb-3">Model Finansal Özeti</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        label="Net Kâr"
                        value={fmt(summary.totalProfit)}
                        sub={`${summary.totalSold} adet satıştan`}
                        icon={TrendingUp}
                        color="border-green-100 text-green-700"
                    />
                    <StatCard
                        label="Toplam Hasılat"
                        value={fmt(summary.totalRevenue)}
                        icon={ShoppingBag}
                        color="border-indigo-100 text-indigo-700"
                    />
                    <StatCard
                        label="Toplam Satış"
                        value={`${summary.totalSold} adet`}
                        icon={Package}
                        color="border-sky-100 text-sky-700"
                    />
                    <StatCard
                        label="Kâr Şampiyonu"
                        value={summary.bestVariant ? summary.bestVariant.label : "—"}
                        sub={summary.bestVariant ? `${fmt(summary.bestVariant.profit)} kâr` : "Henüz satış yok"}
                        icon={Star}
                        color="border-amber-100 text-amber-700"
                    />
                </div>
            </div>

            <Separator />

            {/* ─── Section 2: Variant Breakdown ───────────────────────────── */}
            <div>
                <h2 className="text-base font-bold text-muted-foreground uppercase tracking-wider mb-3">Varyant Kırılımı</h2>

                {variantChartData.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-4 mb-4">
                        <p className="text-sm font-semibold mb-3 text-muted-foreground">Renk/Beden Bazlı Satış Adedi</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={variantChartData} barSize={22}>
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                    formatter={(val: any, name: string | undefined) => [
                                        name === "profit" ? fmt(val) : `${val} adet`,
                                        name === "sold" ? "Satış" : name === "profit" ? "Kâr" : "Stok"
                                    ]}
                                />
                                <Bar dataKey="sold" name="sold" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800">
                                <TableHead>Renk / Beden</TableHead>
                                <TableHead className="text-right">Alış</TableHead>
                                <TableHead className="text-right">Liste Fiyatı</TableHead>
                                <TableHead className="text-right text-indigo-600">Satış Adedi</TableHead>
                                <TableHead className="text-right text-green-600">Kâr</TableHead>
                                <TableHead className="text-center">Toplam Stok</TableHead>
                                <TableHead>Mağaza Stokları</TableHead>
                                <TableHead className="text-center">Durum</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {variantAnalytics.map((v: any) => {
                                const isDeadStock = v.totalStock > 5 && v.totalSold === 0;
                                const isBestseller = v.totalSold >= 5;
                                return (
                                    <TableRow key={v.id} className={cn(
                                        isDeadStock && "bg-red-50/30 dark:bg-red-950/10",
                                        isBestseller && v.totalSold > 10 && "bg-green-50/30 dark:bg-green-950/10"
                                    )}>
                                        <TableCell className="font-semibold">
                                            <div className="flex flex-col">
                                                <span>{v.color ?? "—"} / {v.size ?? "—"}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{v.barcode}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">{fmt(v.purchasePrice)}</TableCell>
                                        <TableCell className="text-right text-sm">{fmt(v.salePrice)}</TableCell>
                                        <TableCell className="text-right font-bold text-indigo-600">{v.totalSold} adet</TableCell>
                                        <TableCell className={cn("text-right font-bold", v.totalProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                            {fmt(v.totalProfit)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={cn("font-bold", v.totalStock === 0 ? "text-red-500" : v.totalStock > 10 ? "text-green-600" : "text-amber-600")}>
                                                {v.totalStock}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {v.stockByStore.map((s: any) => (
                                                    <span key={s.storeId} className={cn(
                                                        "text-xs px-1.5 py-0.5 rounded-full font-medium border",
                                                        s.quantity === 0 ? "bg-red-50 text-red-600 border-red-200" :
                                                            s.quantity < 3 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                                "bg-green-50 text-green-700 border-green-200"
                                                    )}>
                                                        {s.storeName}: {s.quantity}
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {isDeadStock ? (
                                                <Badge variant="destructive" className="text-xs">Ölü Stok</Badge>
                                            ) : v.totalStock === 0 ? (
                                                <Badge className="text-xs bg-gray-100 text-gray-500">Tükendi</Badge>
                                            ) : isBestseller ? (
                                                <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Çok Satıyor</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-xs">Normal</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Separator />

            {/* ─── Section 3: Store Analysis ───────────────────────────────── */}
            <div>
                <h2 className="text-base font-bold text-muted-foreground uppercase tracking-wider mb-3">Mağaza Analizi</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {storeAnalytics.map((s: any) => (
                        <div key={s.storeId} className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-4 flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <Store className="h-5 w-5 text-indigo-500" />
                                <span className="font-bold text-sm">{s.storeName}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <div className="text-xl font-black text-indigo-600">{s.sold}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Satılan</div>
                                </div>
                                <div>
                                    <div className="text-xl font-black text-amber-600">{s.stock}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Stok</div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-green-600">{fmt(s.revenue)}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase font-medium">Hasılat</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {storeAnalytics.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-8">
                            Bu ürünle ilgili mağaza verisi yok
                        </div>
                    )}
                </div>
            </div>

            <Separator />

            {/* ─── Section 4: Sale Timeline ────────────────────────────────── */}
            <div>
                <h2 className="text-base font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Satış Kronolojisi
                    <span className="ml-2 text-xs font-normal text-muted-foreground normal-case">(Son {timeline.length} işlem)</span>
                </h2>

                {timeline.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12 bg-white dark:bg-gray-900 rounded-xl border">
                        Bu modele ait henüz satış kaydı bulunmuyor.
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {timeline.map((t: any, i: number) => {
                            const isDiscounted = t.originalPrice > t.finalPrice;
                            const profitPerUnit = t.finalPrice - t.purchasePrice;
                            return (
                                <div key={`${t.saleId}-${i}`} className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-4 flex items-center gap-4">
                                    {/* Timeline dot */}
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center",
                                        isDiscounted ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"
                                    )}>
                                        {isDiscounted ? <Tag className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                                    </div>

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{t.color} / {t.size}</span>
                                            <Badge variant="secondary" className="text-xs font-normal">{t.quantity} adet</Badge>
                                            {t.store && <span className="text-xs text-muted-foreground">@ {t.store.name}</span>}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {t.customer ? `Müşteri: ${t.customer.name}` : "Misafir Müşteri"}
                                            {t.salesRep && ` • Temsilci: ${t.salesRep.name || t.salesRep.username}`}
                                            {t.cashier && ` • Kasiyer: ${t.cashier.name || t.cashier.username}`}
                                        </div>
                                    </div>

                                    {/* Pricing */}
                                    <div className="text-right flex-shrink-0">
                                        <div className="flex items-center justify-end gap-2">
                                            {isDiscounted && (
                                                <span className="text-xs text-muted-foreground line-through">
                                                    {fmt(t.originalPrice)}
                                                </span>
                                            )}
                                            <span className={cn("font-bold text-base", isDiscounted ? "text-amber-600" : "text-indigo-600")}>
                                                {fmt(t.finalPrice)}
                                            </span>
                                        </div>
                                        <div className={cn("text-xs font-medium", profitPerUnit >= 0 ? "text-green-600" : "text-red-500")}>
                                            Kâr: {fmt(t.profit)}
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div className="text-right flex-shrink-0 hidden sm:block">
                                        <div className="text-xs text-muted-foreground">
                                            {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true, locale: tr })}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(t.createdAt), "dd MMM HH:mm", { locale: tr })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
