"use client"

import { useState } from "react"
import { useProductCampaignForm } from "./hooks/useProductCampaignForm"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Plus, Calculator, Info, Check, Tag, ShoppingBag, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface NewProductCampaignDialogProps {
    uniqueCategories?: string[];
    uniqueBrands?: string[];
}

export function NewProductCampaignDialog({ uniqueCategories = [], uniqueBrands = [] }: NewProductCampaignDialogProps) {
    const [open, setOpen] = useState(false)
    const { form, formValues, isLoading, onSubmit, toggleCategory, toggleBrand } = useProductCampaignForm(() => setOpen(false));

    // Dynamic Summary Generation
    const getCampaignSummary = () => {
        const { targetCategoryIds, targetBrandIds } = formValues;
        const buyQty = Number(formValues.buyQuantity); // Coerce to number
        const getQty = Number(formValues.getQuantity); // Coerce to number
        const discount = Number(formValues.discountPercent); // Coerce to number

        let targetText = "Tüm Ürünler";
        const catLen = targetCategoryIds.length;
        const brandLen = targetBrandIds.length;

        if (catLen > 0 && brandLen > 0) {
            targetText = `Seçili Kategoriler (${catLen}) VE Markalar (${brandLen}) kesişimi`;
        } else if (catLen > 0) {
            targetText = `Seçili Kategoriler (${catLen})`;
        } else if (brandLen > 0) {
            targetText = `Seçili Markalar (${brandLen})`;
        }

        let logicText = "";
        let promoBadge = "";

        if (buyQty === 0) {
            logicText = `Seçili ürünlerde kasada direkt %${discount} indirim.`;
            promoBadge = `%${discount} İNDİRİM`;
        } else {
            const paid = buyQty || 0;
            const free = getQty || 0;
            const total = paid + free;

            if (discount === 100) {
                logicText = `Sepette ${total} ürün varsa, ${free} tanesi bedava.`;
                promoBadge = `${total} AL ${paid} ÖDE`;
            } else {
                logicText = `Sepette ${total} ürün varsa, ${free} tanesi %${discount} indirimli.`;
                promoBadge = `${total}. ÜRÜN %${discount}`;
            }
        }

        return (
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-2 mt-auto">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-1">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Özet</span>
                    <Badge className="bg-indigo-600 text-white font-bold text-xs">
                        {promoBadge}
                    </Badge>
                </div>

                <div className="space-y-1 text-xs text-indigo-900">
                    <div className="flex items-start gap-1">
                        <Tag className="w-3 h-3 mt-0.5 text-indigo-600 shrink-0" />
                        <div><span className="font-bold">Kapsam:</span> {targetText}</div>
                    </div>
                    <div className="flex items-start gap-1">
                        <Calculator className="w-3 h-3 mt-0.5 text-indigo-600 shrink-0" />
                        <div><span className="font-bold">Mantık:</span> {logicText}</div>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
                    <Plus className="w-4 h-4 mr-2" />
                    Yeni Kampanya
                </Button>
            </DialogTrigger>
            {/* FORCE MAX-WIDTH WITH !IMPORTANT AND GRID LAYOUT */}
            <DialogContent className="!max-w-[1000px] w-full h-[80vh] flex flex-col p-0 gap-0 overflow-hidden sm:max-w-[calc(100vw-2rem)]">
                <DialogHeader className="p-5 border-b shrink-0 bg-white">
                    <DialogTitle className="text-xl text-indigo-900">Yeni Kampanya Oluştur</DialogTitle>
                    <DialogDescription>
                        Kampanya kurallarını tanımlayın.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-gray-50/30 p-5">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit as any)} className="h-full">
                            {/* USE GRID INSTEAD OF FLEX FOR RELIABLE COLUMNS */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full min-h-[500px]">

                                {/* LEFT: Info & Target (7 cols) */}
                                <div className="md:col-span-7 flex flex-col gap-4 min-w-0">
                                    {/* Name */}
                                    <div className="bg-white p-4 rounded-lg border shadow-sm">
                                        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm border-b pb-2">
                                            <Info className="w-4 h-4 text-indigo-600" /> Kampanya Bilgisi
                                        </h3>
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="Kampanya Adı Giriniz..." className="font-medium" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    {/* Targeting */}
                                    <div className="bg-white p-4 rounded-lg border shadow-sm flex-1 flex flex-col min-h-[300px]">
                                        <div className="flex justify-between items-center mb-3 text-sm border-b pb-2">
                                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                                <ShoppingBag className="w-4 h-4 text-indigo-600" /> Hedef Kitle
                                            </h3>
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded">
                                                {formValues.targetCategoryIds.length} Kat / {formValues.targetBrandIds.length} Mar
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 flex-1 overflow-hidden min-h-0">
                                            {/* Categories */}
                                            <div className="flex flex-col border rounded bg-gray-50/50 overflow-hidden">
                                                <div className="p-2 bg-gray-100 text-[10px] font-bold text-gray-500 uppercase text-center border-b">
                                                    KATEGORİLER
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
                                                    {uniqueCategories.map(cat => (
                                                        <div key={cat} onClick={() => toggleCategory(cat)}
                                                            className={cn("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs select-none transition-colors",
                                                                formValues.targetCategoryIds.includes(cat) ? "bg-indigo-100 text-indigo-700 font-medium" : "hover:bg-white text-gray-600 hover:text-gray-900")}>
                                                            <div className={cn("w-3 h-3 border rounded flex items-center justify-center bg-white shrink-0", formValues.targetCategoryIds.includes(cat) ? "border-indigo-600" : "border-gray-300")}>
                                                                {formValues.targetCategoryIds.includes(cat) && <Check className="w-2.5 h-2.5 text-indigo-600" />}
                                                            </div>
                                                            <span className="truncate">{cat}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Brands */}
                                            <div className="flex flex-col border rounded bg-gray-50/50 overflow-hidden">
                                                <div className="p-2 bg-gray-100 text-[10px] font-bold text-gray-500 uppercase text-center border-b">
                                                    MARKALAR
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
                                                    {uniqueBrands.map(brand => (
                                                        <div key={brand} onClick={() => toggleBrand(brand)}
                                                            className={cn("flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs select-none transition-colors",
                                                                formValues.targetBrandIds.includes(brand) ? "bg-indigo-100 text-indigo-700 font-medium" : "hover:bg-white text-gray-600 hover:text-gray-900")}>
                                                            <div className={cn("w-3 h-3 border rounded flex items-center justify-center bg-white shrink-0", formValues.targetBrandIds.includes(brand) ? "border-indigo-600" : "border-gray-300")}>
                                                                {formValues.targetBrandIds.includes(brand) && <Check className="w-2.5 h-2.5 text-indigo-600" />}
                                                            </div>
                                                            <span className="truncate">{brand}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Logic (5 cols) */}
                                <div className="md:col-span-5 flex flex-col gap-4 min-w-0">
                                    <div className="bg-white p-4 rounded-lg border shadow-sm h-full flex flex-col">
                                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm border-b pb-2">
                                            <Calculator className="w-4 h-4 text-indigo-600" /> Kural Tanımı
                                        </h3>

                                        <div className="space-y-5 flex-1 p-2">
                                            {/* Step 1 */}
                                            <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                                                <span className="text-xs font-bold text-gray-500 text-right uppercase">Ödenen</span>
                                                <FormField
                                                    control={form.control}
                                                    name="buyQuantity"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input type="number" className="pl-3 h-9 font-bold text-center" {...field} />
                                                                    <div className="absolute right-2 top-2 text-[10px] text-gray-400">Adet</div>
                                                                </div>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Step 2 */}
                                            {formValues.buyQuantity > 0 ? (
                                                <div className="grid grid-cols-[80px_1fr] items-center gap-3 animate-in fade-in slide-in-from-left-2">
                                                    <span className="text-xs font-bold text-indigo-500 text-right uppercase">+ Bedava</span>
                                                    <FormField
                                                        control={form.control}
                                                        name="getQuantity"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <div className="relative">
                                                                        <Input type="number" className="pl-3 h-9 font-bold text-center bg-indigo-50 border-indigo-200 text-indigo-700" {...field} />
                                                                        <div className="absolute right-2 top-2 text-[10px] text-indigo-400">Adet</div>
                                                                    </div>
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="text-center p-2 bg-green-50 text-green-700 text-xs rounded border border-green-200">
                                                    Koşulsuz İndirim Aktif
                                                </div>
                                            )}

                                            {/* Step 3 */}
                                            <div className="grid grid-cols-[80px_1fr] items-center gap-3 pt-3 border-t border-dashed">
                                                <span className="text-xs font-bold text-gray-900 text-right uppercase">İndirim</span>
                                                <FormField
                                                    control={form.control}
                                                    name="discountPercent"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Input type="number" className="pl-3 h-10 text-xl font-black text-center text-indigo-600" min={0} max={100} {...field} />
                                                                    <div className="absolute right-3 top-2 text-gray-300 font-bold">%</div>
                                                                </div>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                        </div>

                                        {getCampaignSummary()}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </Form>
                </div>

                <DialogFooter className="p-4 border-t bg-white shrink-0 z-10">
                    <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                    <Button onClick={form.handleSubmit(onSubmit as any)} className="bg-indigo-600 hover:bg-indigo-700 px-6">
                        {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Kaydet
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
