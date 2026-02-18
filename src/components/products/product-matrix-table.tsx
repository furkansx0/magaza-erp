"use client"

import { ProductWithVariants } from "@/actions/inventory/product-query-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Archive, MoreHorizontal, Box, Trash2, Tag, ChevronDown, ChevronRight, ArrowRightLeft } from "lucide-react"
import { formatCurrency, cn } from "@/lib/utils"
import { useState } from "react"
import { bulkArchive, bulkUpdatePrice } from "@/actions/inventory/bulk-actions"
import { bulkCreateTransfer } from "@/actions/inventory/bulk-transfer-action"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProductMatrixTableProps {
    products: ProductWithVariants[]
    stores: { id: string, name: string }[]
}

export function ProductMatrixTable({ products, stores }: ProductMatrixTableProps) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [expandedRows, setExpandedRows] = useState<string[]>([])

    // Bulk Dialog States
    const [priceDialogOpen, setPriceDialogOpen] = useState(false)
    const [priceOperation, setPriceOperation] = useState<"PERCENTAGE_INCREASE" | "PERCENTAGE_DECREASE" | "SET_FIXED_PRICE">("PERCENTAGE_INCREASE")
    const [priceValue, setPriceValue] = useState("")

    // Bulk Transfer States
    const [transferDialogOpen, setTransferDialogOpen] = useState(false)
    const [sourceStoreId, setSourceStoreId] = useState("")
    const [targetStoreId, setTargetStoreId] = useState("")

    if (products.length === 0) {
        return <div className="p-8 text-center text-muted-foreground border rounded-md">Aradığınız kriterlere uygun ürün bulunamadı.</div>
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === products.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(products.map(p => p.id))
        }
    }

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const toggleExpand = (id: string) => {
        if (expandedRows.includes(id)) {
            setExpandedRows(expandedRows.filter(r => r !== id))
        } else {
            setExpandedRows([...expandedRows, id])
        }
    }

    const handleBulkArchive = async () => {
        if (!confirm(`${selectedIds.length} ürünü arşivlemek istediğinize emin misiniz?`)) return;

        const res = await bulkArchive(selectedIds)
        if (res.success) {
            toast.success(res.message)
            setSelectedIds([])
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    const handleBulkPriceUpdate = async () => {
        const val = Number(priceValue)
        if (isNaN(val) || val <= 0) return toast.error("Geçerli bir değer girin");

        const res = await bulkUpdatePrice(selectedIds, {
            type: priceOperation,
            value: val
        })

        if (res.success) {
            toast.success(res.message)
            setPriceDialogOpen(false)
            setSelectedIds([])
            router.refresh()
        } else {
            toast.error(res.error)
        }
    }

    const handleBulkTransfer = async () => {
        if (!sourceStoreId || !targetStoreId) return toast.error("Mağazaları seçin");
        if (sourceStoreId === targetStoreId) return toast.error("Mağazalar farklı olmalı");

        const res = await bulkCreateTransfer(selectedIds, sourceStoreId, targetStoreId);

        if (res.success) {
            toast.success(res.message);
            setTransferDialogOpen(false);
            setSelectedIds([]);
            router.push(`/dashboard/transfers/${res.transferId}`);
        } else {
            toast.error(res.error);
        }
    }

    return (
        <div className="space-y-4">
            {/* Bulk Toolbar */}
            {selectedIds.length > 0 && (
                <div className="sticky top-2 z-10 bg-primary text-primary-foreground p-3 rounded-lg shadow-lg flex items-center justify-between animate-in slide-in-from-top-2">
                    <div className="font-semibold px-4">
                        {selectedIds.length} ürün seçildi
                    </div>
                    <div className="flex gap-2">
                        {/* Price Dialog */}
                        <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm">
                                    <Tag className="w-4 h-4 mr-2" /> Toplu Fiyat
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="text-foreground">
                                <DialogHeader>
                                    <DialogTitle>Toplu Fiyat Güncelleme</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>İşlem Türü</Label>
                                        <Select value={priceOperation} onValueChange={(v: any) => setPriceOperation(v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PERCENTAGE_INCREASE">Yüzde Zam Yap (%)</SelectItem>
                                                <SelectItem value="PERCENTAGE_DECREASE">Yüzde İndirim Yap (%)</SelectItem>
                                                <SelectItem value="SET_FIXED_PRICE">Sabit Fiyat Ata</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Değer</Label>
                                        <Input
                                            type="number"
                                            placeholder="Örn: 10"
                                            value={priceValue}
                                            onChange={e => setPriceValue(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleBulkPriceUpdate}>Güncelle</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* Transfer Dialog */}
                        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="secondary" size="sm">
                                    <ArrowRightLeft className="w-4 h-4 mr-2" /> Toplu Transfer
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="text-foreground">
                                <DialogHeader>
                                    <DialogTitle>Toplu Transfer Oluştur</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <p className="text-sm text-muted-foreground">
                                        Seçili {selectedIds.length} ürünün varyantları, kaynak mağazadaki stok adetleriyle birlikte transfere eklenecektir.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Çıkış (Kaynak)</Label>
                                            <Select onValueChange={setSourceStoreId}>
                                                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                                                <SelectContent>
                                                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Varış (Hedef)</Label>
                                            <Select onValueChange={setTargetStoreId}>
                                                <SelectTrigger><SelectValue placeholder="Seç" /></SelectTrigger>
                                                <SelectContent>
                                                    {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleBulkTransfer}>Transferi Oluştur</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button variant="destructive" size="sm" onClick={handleBulkArchive}>
                            <Archive className="w-4 h-4 mr-2" /> Arşivle
                        </Button>
                        <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary/80" onClick={() => setSelectedIds([])}>
                            Vazgeç
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={selectedIds.length === products.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="w-[300px]">Model Adı</TableHead>
                            <TableHead>Marka</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-center">Toplam Stok</TableHead>
                            <TableHead className="text-right">Fiyat Aralığı</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.map((product) => {
                            const isExpanded = expandedRows.includes(product.id)
                            const totalStock = product.variants.reduce((acc, v) =>
                                acc + v.stocks.reduce((sAcc, s) => sAcc + s.quantity, 0), 0)

                            let attributes: any = {}
                            try { if (product.attributes) attributes = JSON.parse(product.attributes) } catch (e) { }

                            const prices = product.variants.map(v => Number(v.salePrice)).filter(p => p > 0)
                            const minPrice = prices.length ? Math.min(...prices) : 0
                            const maxPrice = prices.length ? Math.max(...prices) : 0
                            const priceDisplay = (minPrice === maxPrice && minPrice > 0)
                                ? formatCurrency(minPrice)
                                : (minPrice > 0 ? `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}` : "-")

                            return (
                                <>
                                    <TableRow key={product.id} className={cn("hover:bg-muted/50 transition-colors", isExpanded && "bg-muted/50 border-b-0")}>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(product.id)}>
                                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <Checkbox
                                                checked={selectedIds.includes(product.id)}
                                                onCheckedChange={() => toggleSelect(product.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col cursor-pointer" onClick={() => toggleExpand(product.id)}>
                                                <span>{product.name}</span>
                                                <span className="text-xs text-muted-foreground">{product.variants.length} Varyant</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{product.brand}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span>{product.category}</span>
                                                <span className="text-xs text-muted-foreground">{product.subCategory}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-mono font-bold ${totalStock === 0 ? "text-red-500" : "text-green-600"}`}>
                                                {totalStock}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-sm">
                                            {priceDisplay}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => router.push(`/dashboard/products/${product.id}`)}>
                                                        <Edit className="w-4 h-4 mr-2" /> Düzenle
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600">
                                                        <Archive className="w-4 h-4 mr-2" /> Arşivle
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>

                                    {/* Expanded Variant Table */}
                                    {isExpanded && (
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableCell colSpan={8} className="p-0">
                                                <div className="p-4 pl-12">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Varyant (SKU)</TableHead>
                                                                <TableHead>Renk</TableHead>
                                                                <TableHead>Beden</TableHead>
                                                                <TableHead>Barkod</TableHead>
                                                                {stores.map(s => <TableHead key={s.id} className="text-center">{s.name}</TableHead>)}
                                                                <TableHead className="text-right">Fiyat</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {product.variants.map(variant => (
                                                                <TableRow key={variant.id}>
                                                                    <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                                                                    <TableCell>{variant.color}</TableCell>
                                                                    <TableCell>{variant.size}</TableCell>
                                                                    <TableCell className="font-mono text-xs">{variant.barcode}</TableCell>
                                                                    {stores.map(s => {
                                                                        const st = variant.stocks.find(stock => stock.storeId === s.id)
                                                                        return (
                                                                            <TableCell key={s.id} className="text-center font-mono">
                                                                                {st?.quantity || <span className="text-gray-300">-</span>}
                                                                            </TableCell>
                                                                        )
                                                                    })}
                                                                    <TableCell className="text-right">{formatCurrency(Number(variant.salePrice))}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
