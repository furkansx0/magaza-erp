"use client"

import * as React from "react"
import { Check, Loader2, Save, Trash2, Plus, ArrowRight, Package, DollarSign, Grip, Eraser, Barcode, ScanBarcode, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useProductWizard } from "../hooks/useProductWizard"
import { updateProductMatrix } from "@/actions/inventory/product-edit-actions"
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PRODUCT_TAXONOMY, BRANDS, SEASONS, MATERIALS, STYLES } from "@/lib/taxonomy"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Utility for creating new categories
function CreatableSelect({
    options,
    value,
    onChange,
    placeholder
}: {
    options: string[],
    value: string,
    onChange: (val: string) => void,
    placeholder: string
}) {
    const [open, setOpen] = React.useState(false)
    const [inputValue, setInputValue] = React.useState("")

    const filteredOptions = options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase()))

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-10 font-normal">
                    {value || placeholder}
                    <Grip className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`${placeholder} ara veya yaz...`} value={inputValue} onValueChange={setInputValue} />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-2">
                                <span className="text-sm text-muted-foreground">Sonuç yok.</span>
                                {inputValue && (
                                    <Button variant="secondary" size="sm" className="w-full mt-2" onClick={() => { onChange(inputValue); setOpen(false); }}>
                                        "{inputValue}" Oluştur
                                    </Button>
                                )}
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {filteredOptions.map((option) => (
                                <CommandItem key={option} value={option} onSelect={(currentValue) => { onChange(currentValue); setOpen(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", value === option ? "opacity-100" : "opacity-0")} />
                                    {option}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export function ProductWizard({
    open,
    onOpenChange,
    stores,
    initialProduct,
    mode = "create" // NEW: "create" | "append"
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    stores: { id: string, name: string }[]
    initialProduct?: any
    mode?: "create" | "append" | "edit"
}) {
    const {
        step, setStep,
        isSubmitting,
        model, setModel,
        defaultCategories,
        variantGroups,
        currentColor, setCurrentColor,
        currentSizes, setCurrentSizes,
        sizeInput, setSizeInput,
        editingExistingGroup,
        originalSizesOfEditingGroup,
        matrixData, setMatrixData,
        addSizeToGroup,
        addVariantGroup,
        removeGroup,
        generateMatrix,
        updateMatrixRow,
        applyBulk,
        applyBulkStock,
        onSubmit,
        generateAllBarcodes,
        setEditingExistingGroup,
        setOriginalSizesOfEditingGroup,
        setCurrentColor: _sc,
        setCurrentSizes: _ss,
        setVariantGroups,
        updateStock,
    } = useProductWizard(open, stores, initialProduct, mode);

    // Focus helpers
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select()
    const focusNextRow = (currentIndex: number, header: string) => {
        const next = document.getElementById(`${header}-${currentIndex + 1}`)
        if (next) (next as HTMLInputElement).focus()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-[95vw] w-full !h-[95vh] flex flex-col p-0 gap-0 bg-white dark:bg-gray-900 border-none sm:rounded-lg overflow-hidden">

                {/* Header */}
                <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between shrink-0 bg-gray-50">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-xl font-bold">
                            {mode === "append" ? `Varyant Ekle: ${model.name}` : "Yeni Ürün Ekle"}
                        </DialogTitle>
                        <Badge variant="outline" className="bg-white">{step}. Adım</Badge>
                    </div>

                    {/* Simple Step Indicator */}
                    <div className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full transition-colors", step >= 1 ? "bg-blue-600" : "bg-gray-300")} />
                        <div className={cn("h-1 w-6 rounded transition-colors", step >= 2 ? "bg-blue-600" : "bg-gray-200")} />
                        <div className={cn("h-2 w-2 rounded-full transition-colors", step >= 2 ? "bg-blue-600" : "bg-gray-300")} />
                        <div className={cn("h-1 w-6 rounded transition-colors", step >= 3 ? "bg-blue-600" : "bg-gray-200")} />
                        <div className={cn("h-2 w-2 rounded-full transition-colors", step >= 3 ? "bg-blue-600" : "bg-gray-300")} />
                        <div className={cn("h-1 w-6 rounded transition-colors", step >= 4 ? "bg-blue-600" : "bg-gray-200")} />
                        <div className={cn("h-2 w-2 rounded-full transition-colors", step >= 4 ? "bg-blue-600" : "bg-gray-300")} />
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white">

                    {/* STEP 1: Basic Info */}
                    {step === 1 && (
                        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2 mb-4">Ürün Kimliği</h3>

                                <div className="space-y-2">
                                    <Label>Ürün / Model Adı <span className="text-red-500">*</span></Label>
                                    <Input
                                        autoFocus
                                        value={model.name}
                                        onChange={(e) => setModel({ ...model, name: e.target.value })}
                                        placeholder="Örn: Slim Fit Gömlek"
                                        className="h-11 text-lg"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Model Kodu (Opsiyonel)</Label>
                                    <Input
                                        value={model.modelCode}
                                        onChange={(e) => setModel({ ...model, modelCode: e.target.value })}
                                        placeholder="Örn: GOM-001"
                                        className="font-mono bg-yellow-50/50"
                                    />
                                    <p className="text-[10px] text-gray-500">Varyant SKU'ları ve barkodlar için ön ek olarak kullanılır.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Marka</Label>
                                        <CreatableSelect
                                            placeholder="Seç veya Yaz..."
                                            options={BRANDS}
                                            value={model.brand}
                                            onChange={(v) => setModel({ ...model, brand: v })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Sezon</Label>
                                        <Select value={model.season} onValueChange={(v) => setModel({ ...model, season: v })} defaultValue={model.season}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-500 uppercase border-b pb-2 mb-4">Kategorizasyon</h3>

                                <div className="space-y-2">
                                    <Label>Cinsiyet</Label>
                                    <div className="flex gap-2">
                                        {PRODUCT_TAXONOMY.map(t => (
                                            <div
                                                key={t.value}
                                                onClick={() => setModel({ ...model, gender: t.value })}
                                                className={cn(
                                                    "px-4 py-2 text-sm border rounded-md cursor-pointer transition-all",
                                                    model.gender === t.value ? "bg-black text-white border-black font-semibold shadow" : "bg-white hover:bg-gray-50"
                                                )}
                                            >
                                                {t.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Kategori</Label>
                                    <CreatableSelect
                                        placeholder="Kategori Seç veya Yaz"
                                        options={defaultCategories}
                                        value={model.category}
                                        onChange={(v) => setModel({ ...model, category: v })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Materyal</Label>
                                        <CreatableSelect options={MATERIALS} value={model.material} onChange={(v) => setModel({ ...model, material: v })} placeholder="Seç/Yaz" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tarz (Kalıp)</Label>
                                        <CreatableSelect options={STYLES} value={model.style} onChange={(v) => setModel({ ...model, style: v })} placeholder="Seç/Yaz" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Variants */}
                    {step === 2 && (
                        <div className="max-w-3xl mx-auto flex flex-col gap-6">
                            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <Label>Renk</Label>
                                    <Input
                                        value={currentColor} onChange={(e) => setCurrentColor(e.target.value)}
                                        placeholder="Örn: Siyah" className="bg-white" autoFocus
                                        disabled={editingExistingGroup} // Locked for existing groups
                                    />
                                    {editingExistingGroup && <span className="text-[10px] text-red-500">* Mevcut grubun rengi değiştirilemez.</span>}
                                </div>
                                <div className="flex-[2] space-y-2">
                                    <Label>Bedenler (Örn: S, M, L, XL)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={sizeInput} onChange={(e) => setSizeInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addSizeToGroup()}
                                            placeholder="Beden yaz ve Enter'a bas" className="bg-white"
                                        />
                                        <Button onClick={addSizeToGroup} variant="secondary">Ekle</Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-h-[24px]">
                                        {currentSizes.map(s => {
                                            const isLocked = editingExistingGroup && originalSizesOfEditingGroup.includes(s);
                                            return (
                                                <Badge key={s} variant="outline" className={cn("px-2 py-1", isLocked ? "bg-gray-100 text-gray-500 border-gray-300" : "bg-white border-blue-200")}>
                                                    {s}
                                                    {!isLocked && (
                                                        <span className="ml-2 cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setCurrentSizes(prev => prev.filter(x => x !== s))}>Ã—</span>
                                                    )}
                                                    {isLocked && <span className="ml-2 text-gray-400">ğŸ”’</span>}
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                </div>
                                <Button onClick={addVariantGroup} className="self-end mb-1" disabled={!currentColor || currentSizes.length === 0}>
                                    <Plus className="mr-2 h-4 w-4" /> Ekle
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm text-gray-500">Oluşturulacak Gruplar</h4>
                                {variantGroups.length === 0 && <div className="text-gray-400 text-sm italic py-4">Henüz varyant eklemediniz.</div>}
                                <div className="grid gap-2">
                                    {variantGroups.map(group => (
                                        <div key={group.id} className="flex items-center justify-between p-3 border rounded bg-white shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <span className="font-bold w-32 border-r">{group.color}</span>
                                                <div className="flex gap-1">
                                                    {group.sizes.map(s => <span key={s} className="bg-gray-100 text-xs px-2 py-1 rounded">{s}</span>)}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => {
                                                    // Load into inputs
                                                    setCurrentColor(group.color);
                                                    setCurrentSizes(group.sizes);

                                                    // Set Edit Mode for this group
                                                    if (group.existing) {
                                                        setEditingExistingGroup(true);
                                                        setOriginalSizesOfEditingGroup(group.originalSizes || []);
                                                    } else {
                                                        setEditingExistingGroup(false);
                                                        setOriginalSizesOfEditingGroup([]);
                                                    }

                                                    // Remove from list
                                                    removeGroup(group.id);
                                                    toast.info("Grup düzenleme için yüklendi.");
                                                }}>
                                                    <Eraser className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-red-500"
                                                    onClick={() => removeGroup(group.id)}
                                                    disabled={group.existing} // CANNOT DELETE EXISTING GROUP
                                                    title={group.existing ? "Mevcut varyant grubu silinemez" : "Grubu Sil"}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Matrix & Stocks */}
                    {step === 3 && (
                        <div className="h-full flex flex-col gap-4">
                            {/* Bulk Operations Bar */}
                            <div className="flex flex-wrap items-end gap-x-6 gap-y-4 bg-gray-50 p-4 border rounded-md shadow-sm">
                                {/* Price Bulk */}
                                <div className="flex gap-2 items-end">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-gray-500">Alış Fiyatı (₺)</Label>
                                        <Input className="h-8 w-24 bg-white" placeholder="0.00" onChange={(e) => applyBulk('purchasePrice', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-gray-500">Satış Fiyatı (₺)</Label>
                                        <Input className="h-8 w-24 bg-white font-bold text-green-700" placeholder="0.00" onChange={(e) => applyBulk('salePrice', e.target.value)} />
                                    </div>

                                    <div className="w-[1px] h-8 bg-gray-300 mx-2" />

                                    {/* Bulk Stock Button */}
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="h-8 border-dashed bg-white">
                                                <Package className="mr-2 h-4 w-4" />
                                                Toplu Stok Ata
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <div className="space-y-4">
                                                <h4 className="font-medium leading-none">Varyantlara Stok Dağıt</h4>
                                                <div className="grid gap-2">
                                                    {stores.map(s => (
                                                        <div key={s.id} className="grid grid-cols-3 items-center gap-4">
                                                            <Label className="col-span-2 text-xs">{s.name}</Label>
                                                            <Input
                                                                className="h-8"
                                                                placeholder="Adet"
                                                                type="number"
                                                                onChange={(e) => applyBulkStock(s.id, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="flex-1" />

                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={generateAllBarcodes} className="h-9 border-orange-200 text-orange-700 hover:bg-orange-50">
                                        <Barcode className="mr-2 h-4 w-4" />
                                        Sıralı Barkod Üret
                                    </Button>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="flex-1 border rounded-md overflow-auto bg-white shadow-sm relative">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-100 border-b sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 py-2 w-10">
                                                <Checkbox checked={matrixData.every(r => r.enabled)} onCheckedChange={(c) => setMatrixData(prev => prev.map(r => ({ ...r, enabled: !!c })))} />
                                            </th>
                                            <th className="px-3 py-2 text-left font-bold text-gray-600">Varyant</th>
                                            <th className="px-3 py-2 text-left font-bold text-gray-600 w-48">SKU / Model Kodu</th>
                                            <th className="px-3 py-2 text-left font-bold text-gray-600 w-40">Barkod</th>
                                            <th className="px-3 py-2 text-right font-bold text-gray-600 w-24">Alış</th>
                                            <th className="px-3 py-2 text-right font-bold text-gray-600 w-24">Satış</th>
                                            {stores.map(s => (
                                                <th key={s.id} className="px-3 py-2 text-center font-bold text-gray-600 w-20 border-l">{s.name}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {matrixData.map((row, idx) => (
                                            <tr key={row.id} className={cn("hover:bg-blue-50/50 transition-colors", !row.enabled && "opacity-40 bg-gray-50")}>
                                                <td className="px-3 py-2 text-center">
                                                    <Checkbox
                                                        checked={row.enabled}
                                                        onCheckedChange={(c) => updateMatrixRow(row.id, 'enabled', c)}
                                                        disabled={/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id)} // Lock if UUID (Existing)
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium">{row.color}</div>
                                                    <div className="text-xs text-gray-500 font-bold">{row.size}</div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        value={row.sku} onChange={(e) => updateMatrixRow(row.id, 'sku', e.target.value)}
                                                        className="h-7 text-xs font-mono border-gray-200"
                                                        disabled={mode === "edit"} // Locked in Edit Mode
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="relative">
                                                        <Input
                                                            id={`barcode-${idx}`}
                                                            value={row.barcode} onChange={(e) => updateMatrixRow(row.id, 'barcode', e.target.value)}
                                                            className="h-7 text-xs font-mono border-gray-200 pr-7"
                                                            placeholder="Barkod"
                                                            onKeyDown={(e) => e.key === 'Enter' && focusNextRow(idx, 'barcode')}
                                                            onFocus={handleFocus}
                                                            disabled={mode === "edit"} // Locked in Edit Mode
                                                        />
                                                        {row.barcode && <ScanBarcode className="absolute right-2 top-1.5 h-3 w-3 text-gray-400" />}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 bg-gray-50/30">
                                                    <Input
                                                        id={`purchase-${idx}`}
                                                        className="h-7 text-xs text-right border-gray-200"
                                                        value={row.purchasePrice}
                                                        onChange={(e) => updateMatrixRow(row.id, 'purchasePrice', e.target.value)}
                                                        onFocus={handleFocus}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 bg-green-50/30">
                                                    <Input
                                                        id={`sale-${idx}`}
                                                        className="h-7 text-xs text-right font-bold text-green-700 border-green-200 bg-white"
                                                        value={row.salePrice}
                                                        onChange={(e) => updateMatrixRow(row.id, 'salePrice', e.target.value)}
                                                        onFocus={handleFocus}
                                                        onKeyDown={(e) => e.key === 'Enter' && focusNextRow(idx, 'sale')}
                                                    />
                                                </td>
                                                {stores.map(s => (
                                                    <td key={s.id} className="px-3 py-2 border-l text-center">
                                                        <Input
                                                            type="number"
                                                            className="h-7 w-16 mx-auto text-center"
                                                            value={row.stocks[s.id]}
                                                            onChange={(e) => updateStock(row.id, s.id, e.target.value)}
                                                            onFocus={handleFocus}
                                                        />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    )}

                    {/* STEP 4: Success & Print */}
                    {step === 4 && (
                        <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-500">

                            <div className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-2xl p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600" />

                                <div className="h-20 w-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center shadow-sm border border-green-100">
                                    <Check className="h-10 w-10" />
                                </div>

                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">İşlem Başarıyla Tamamlandı!</h2>
                                    <p className="text-gray-500 text-sm">
                                        <strong>{model.name}</strong> ve varyantları sisteme başarıyla kaydedildi.
                                    </p>
                                </div>

                                <div className="w-full bg-gray-50 rounded-lg p-4 border border-gray-100 text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Model</span>
                                        <span className="font-bold">{model.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Toplam Varyant</span>
                                        <span className="font-bold">{matrixData.filter(x => x.enabled).length} Adet</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Yeni Eklenen</span>
                                        <span className="font-bold text-green-600">
                                            {(() => {
                                                const active = matrixData.filter(x => x.enabled);
                                                if (mode === 'create' || !initialProduct) return active.length;
                                                // In edit mode, check against initial IDs
                                                // Existing IDs are UUIDs, new ones might be random or new UUIDs not in DB
                                                const initialIds = new Set(initialProduct.variants?.map((v: any) => v.id) || []);
                                                return active.filter(v => !initialIds.has(v.id)).length;
                                            })()} Adet
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Atanan Mağaza</span>
                                        <span className="font-bold">{stores.length} Mağaza</span>
                                    </div>
                                </div>

                                <div className="w-full space-y-3 pt-2">
                                    <Button
                                        className="w-full h-12 text-base gap-2 bg-blue-600 hover:bg-blue-700 shadow-blue-200 shadow-lg transition-all"
                                        onClick={() => {
                                            const active = matrixData.filter(x => x.enabled);
                                            let count = active.length;
                                            if (mode === 'edit' && initialProduct) {
                                                const initialIds = new Set(initialProduct.variants?.map((v: any) => v.id) || []);
                                                count = active.filter(v => !initialIds.has(v.id)).length;
                                            }
                                            toast.info(`Bartender ile ${count} adet yeni ürün etiketi yazdırılacak.`);
                                        }}
                                    >
                                        <Printer className="w-5 h-5" />
                                        {(() => {
                                            const active = matrixData.filter(x => x.enabled);
                                            let count = active.length;
                                            if (mode === 'edit' && initialProduct) {
                                                const initialIds = new Set(initialProduct.variants?.map((v: any) => v.id) || []);
                                                count = active.filter(v => !initialIds.has(v.id)).length;
                                            }
                                            return `Yeni Etiketleri Yazdır (${count})`;
                                        })()}
                                    </Button>

                                    <p className="text-[10px] text-gray-400">
                                        * Sadece yeni eklenen varyantlar için etiket yazdırılır.
                                    </p>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center shrink-0">
                    <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)} className="h-11">
                        {step === 1 ? "İptal" : "Geri Dön"}
                    </Button>

                    <Button
                        onClick={() => {
                            if (step === 1) {
                                if (!model.name) return toast.error("Model adı giriniz");
                                setStep(2);
                            }
                            else if (step === 2) generateMatrix();
                            else onSubmit();
                        }}
                        disabled={isSubmitting}
                        className={cn(
                            "h-11 px-8 min-w-[150px]",
                            step === 3 ? "bg-green-600 hover:bg-green-700 text-white" : "bg-black text-white hover:bg-gray-800",
                            step === 4 && "hidden" // Hide main button in Step 4
                        )}
                    >
                        {step === 3 ? (
                            <>
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                Kaydet
                            </>
                        ) : (
                            <>Devam Et <ArrowRight className="ml-2 h-5 w-5" /></>
                        )}
                    </Button>

                    {step === 4 && (
                        <div className="flex gap-2 w-full justify-end">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-6">
                                Kapat
                            </Button>
                            <Button
                                className="h-11 px-6 bg-black text-white hover:bg-gray-800"
                                onClick={() => {
                                    setStep(1);
                                    setModel({
                                        name: "",
                                        modelCode: "",
                                        brand: "",
                                        gender: "Erkek",
                                        category: "",
                                        subCategory: "",
                                        material: "",
                                        style: "",
                                        season: "2024 Yaz",
                                        description: "",
                                    });
                                    setVariantGroups([]);
                                    setMatrixData([]);
                                    if (mode === 'edit') onOpenChange(false);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Yeni Ürün Ekle
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    )
}
