"use client"

import * as React from "react"
import { ProductSearch } from "./product-search"
import { StockQueryDialog } from "./stock-query-dialog"
import { QuickTransferDialog } from "./quick-transfer-dialog"
import { CustomerPanel } from "./customer-panel"
import { PaymentDialog } from "./payment-dialog"
import { processSale } from "@/actions/pos/pos-actions"
import { PosProduct } from "@/types/pos"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, ShoppingCart, CreditCard, Banknote, CheckCircle2, Loader2, Receipt, LayoutDashboard, ShoppingBag, RefreshCw, Truck, Search as SearchIcon, UserSquare, Coins, Tag, ChevronDown, ChevronUp, Plus } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StoreExpenseDialog } from "./store-expense-dialog"
import { CashClosingDialog } from "./cash-closing-dialog"
import { ProductCampaign } from "@prisma/client"
import { useCampaigns } from "@/hooks/use-campaigns"

interface Staff {
    id: string;
    username: string;
    name: string | null;
    storeId: string | null;
}

// A "sub-row" represents one unit of a cart item that can have its own price
export interface CartSubRow {
    id: string; // unique sub-row id
    finalPrice: number;
    salesRepId?: string;
}

export interface CartItem extends PosProduct {
    quantity: number;
    originalPrice: number;
    finalPrice: number;
    salesRepId?: string;
    // Sub-rows for split pricing (one per unit when expanded)
    subRows?: CartSubRow[];
    isExpanded?: boolean;
}

export function PosClient({ staffList, storeName, stores, currentUserRole, currentUserStoreId, campaigns }: {
    staffList: Staff[],
    storeName: string,
    stores?: { id: string, name: string }[],
    currentUserRole?: string,
    currentUserStoreId?: string | null,
    campaigns: ProductCampaign[]
}) {
    const [cart, setCart] = React.useState<CartItem[]>([])
    const [selectedCustomer, setSelectedCustomer] = React.useState<any | null>(null)
    const [isExchangeMode, setIsExchangeMode] = React.useState(false)

    // Campaigns
    const { calculateDiscounts } = useCampaigns(campaigns);
    const campaignDiscounts = React.useMemo(() => calculateDiscounts(cart), [cart, calculateDiscounts]);
    const totalCampaignDiscount = campaignDiscounts.reduce((acc, d) => acc + d.discountAmount, 0);

    // Dialog States
    const [stockQueryOpen, setStockQueryOpen] = React.useState(false)
    const [transferOpen, setTransferOpen] = React.useState(false)
    const [expenseOpen, setExpenseOpen] = React.useState(false)
    const [cashClosingOpen, setCashClosingOpen] = React.useState(false)

    // Store Selection State (defaults to user's store or first available store if Admin)
    const defaultStoreId = currentUserStoreId || (stores && stores.length > 0 ? stores[0].id : "")
    const [selectedStoreId, setSelectedStoreId] = React.useState<string>(defaultStoreId)

    // Filter staff based on selected store
    const filteredStaffList = React.useMemo(() => {
        if (!selectedStoreId) return staffList;
        return staffList.filter(s => s.storeId === selectedStoreId);
    }, [staffList, selectedStoreId]);

    // Checkout states
    const [checkoutLoading, setCheckoutLoading] = React.useState(false)
    const [lastSaleId, setLastSaleId] = React.useState<string | null>(null)
    const [showSuccessDialog, setShowSuccessDialog] = React.useState(false)
    const [receiptUrl, setReceiptUrl] = React.useState<string | null>(null)

    const [exchangeTarget, setExchangeTarget] = React.useState<'INCOMING' | 'OUTGOING'>('OUTGOING');

    const addToCart = (product: PosProduct) => {
        // ALLOW 0 STOCK IF ADDING AS RETURN (Incoming Exchange)
        const isReturn = isExchangeMode && exchangeTarget === 'INCOMING';

        if (!isReturn && product.stock <= 0) {
            toast.error("Stokta ürün kalmadı!");
            return;
        }

        let qtyToAdd = 1;
        if (isExchangeMode) {
            qtyToAdd = exchangeTarget === 'INCOMING' ? -1 : 1;
        }

        setCart(prev => {
            const existing = prev.find(item => item.variantId === product.variantId)

            if (existing) {
                const newQty = existing.quantity + qtyToAdd;
                if (qtyToAdd > 0 && existing.quantity >= product.stock) {
                    toast.error(`Stok yetersiz! (Mevcut: ${product.stock})`);
                    return prev;
                }
                if (newQty === 0) return prev.filter(i => i.variantId !== product.variantId);

                return prev.map(item =>
                    item.variantId === product.variantId
                        ? { ...item, quantity: newQty }
                        : item
                )
            }
            // New Item
            return [{
                ...product,
                quantity: qtyToAdd,
                originalPrice: product.price,
                finalPrice: product.price,
                salesRepId: filteredStaffList[0]?.id
            }, ...prev]
        })

        let msg = "Ürün sepete eklendi";
        if (isExchangeMode) {
            msg = qtyToAdd < 0 ? "İade ürünü eklendi (Gelen)" : "Satış ürünü eklendi (Giden)";
        }
        toast.info(msg, { duration: 1000, position: "bottom-center" })
    }

    const updateQuantity = (variantId: string, qty: number) => {
        setCart(prev => prev.map(item => {
            if (item.variantId === variantId) {
                if (qty === 0) return item; // Don't allow 0 via update, user should delete

                // Stock check for positive
                if (qty > 0 && qty > item.stock) {
                    toast.error(`Stok yetersiz! (Maks: ${item.stock})`);
                    return item;
                }
                // Sync sub-rows if expanded
                if (item.isExpanded && item.subRows) {
                    const currentSubRows = item.subRows;
                    if (qty > currentSubRows.length) {
                        // Add new sub-rows with original price
                        const newRows: CartSubRow[] = Array.from({ length: qty - currentSubRows.length }, (_, i) => ({
                            id: `${variantId}-sub-${Date.now()}-${i}`,
                            finalPrice: item.originalPrice,
                            salesRepId: item.salesRepId
                        }));
                        return { ...item, quantity: qty, subRows: [...currentSubRows, ...newRows] };
                    } else if (qty < currentSubRows.length) {
                        return { ...item, quantity: qty, subRows: currentSubRows.slice(0, qty) };
                    }
                }
                return { ...item, quantity: qty }
            }
            return item
        }))
    }

    const updateSalesRep = (variantId: string, staffId: string) => {
        setCart(prev => prev.map(item =>
            item.variantId === variantId ? { ...item, salesRepId: staffId } : item
        ));
    }

    const updateFinalPrice = (variantId: string, newPrice: number) => {
        setCart(prev => prev.map(item =>
            item.variantId === variantId ? { ...item, finalPrice: newPrice >= 0 ? newPrice : 0 } : item
        ))
    }

    const restoreOriginalPrice = (variantId: string) => {
        setCart(prev => prev.map(item =>
            item.variantId === variantId ? { ...item, finalPrice: item.originalPrice } : item
        ))
    }

    const updateSubRowPrice = (variantId: string, subRowId: string, newPrice: number) => {
        setCart(prev => prev.map(item => {
            if (item.variantId !== variantId || !item.subRows) return item;
            const updatedSubRows = item.subRows.map(sr =>
                sr.id === subRowId ? { ...sr, finalPrice: newPrice >= 0 ? newPrice : 0 } : sr
            );
            // Re-compute finalPrice as average for the parent
            const avgPrice = updatedSubRows.reduce((acc, sr) => acc + sr.finalPrice, 0) / updatedSubRows.length;
            return { ...item, subRows: updatedSubRows, finalPrice: avgPrice };
        }));
    };

    const restoreSubRowOriginalPrice = (variantId: string, subRowId: string) => {
        const item = cart.find(i => i.variantId === variantId);
        if (!item) return;
        updateSubRowPrice(variantId, subRowId, item.originalPrice);
    };

    const toggleExpand = (variantId: string) => {
        setCart(prev => prev.map(item => {
            if (item.variantId !== variantId) return item;
            if (item.isExpanded) {
                // Collapse: remove sub-rows, set finalPrice to original (no discount in collapsed)
                return { ...item, isExpanded: false, subRows: undefined };
            } else {
                // Expand: create sub-rows for each unit
                const subRows: CartSubRow[] = Array.from({ length: Math.abs(item.quantity) }, (_, i) => ({
                    id: `${variantId}-sub-${i}`,
                    finalPrice: item.finalPrice,
                    salesRepId: item.salesRepId
                }));
                return { ...item, isExpanded: true, subRows };
            }
        }));
    };

    const removeFromCart = (variantId: string) => {
        setCart(prev => prev.filter(item => item.variantId !== variantId))
    }

    const clearCart = () => {
        if (confirm("Sepeti temizlemek istediğinize emin misiniz?")) {
            setCart([])
            setSelectedCustomer(null)
        }
    }

    React.useEffect(() => {
        setCart([])
    }, [selectedStoreId])

    const totalAmount = cart.reduce((acc, item) => {
        if (item.isExpanded && item.subRows) {
            return acc + item.subRows.reduce((subAcc, sr) => subAcc + sr.finalPrice, 0);
        }
        return acc + (item.finalPrice * item.quantity);
    }, 0)

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false)

    const handleOpenPayment = () => {
        if (cart.length === 0) { toast.error("Sepet boş!"); return; }

        // Validate Sales Reps (Only if NOT in Exchange Mode)
        if (!isExchangeMode) {
            const missingRep = cart.find(i => !i.salesRepId);
            if (missingRep) {
                toast.error(`"${missingRep.modelName}" için satış temsilcisi seçilmedi!`);
                return;
            }
        }

        // EXCHANGE LOGIC: If exchange balance is <= 0 (Customer is owed money or even),
        // we process it immediately as 0 financial impact using empty payments.
        if (isExchangeMode && exchangeBalance <= 0) {
            handleCompletePayment([], true); // Pass flag to indicate zero-balance exchange
            return;
        }

        setIsPaymentDialogOpen(true)
    }

    // Helper to flatten cart items (handle expanded sub-rows for sale processing)
    const getFlattenedCartItems = () => {
        const flatItems: Array<{
            variantId: string;
            quantity: number;
            originalPrice: number;
            finalPrice: number;
            salesRepId?: string;
        }> = [];

        for (const item of cart) {
            if (item.isExpanded && item.subRows) {
                // Group sub-rows by price
                const priceGroups = new Map<number, number>();
                for (const sr of item.subRows) {
                    priceGroups.set(sr.finalPrice, (priceGroups.get(sr.finalPrice) || 0) + 1);
                }
                for (const [price, qty] of priceGroups) {
                    flatItems.push({
                        variantId: item.variantId,
                        quantity: qty,
                        originalPrice: item.originalPrice,
                        finalPrice: price,
                        salesRepId: item.salesRepId
                    });
                }
            } else {
                flatItems.push({
                    variantId: item.variantId,
                    quantity: item.quantity,
                    originalPrice: item.originalPrice,
                    finalPrice: item.finalPrice,
                    salesRepId: item.salesRepId
                });
            }
        }
        return flatItems;
    };

    const handleCompletePayment = async (payments: any[], isZeroBalanceExchange = false) => {
        setCheckoutLoading(true)
        try {
            const primaryStaffId = filteredStaffList[0]?.id;
            const finalTotalAmount = isZeroBalanceExchange ? 0 : (isExchangeMode ? exchangeBalance : (totalAmount - totalCampaignDiscount));

            const result = await processSale({
                items: getFlattenedCartItems(),
                totalAmount: finalTotalAmount,
                payments: payments,
                staffId: primaryStaffId,
                customerId: selectedCustomer?.id,
                storeId: selectedStoreId
            })

            if (result.success) {
                setLastSaleId(result.saleId || "unknown")
                setShowSuccessDialog(true)
                setCart([])
                setSelectedCustomer(null)
                setIsPaymentDialogOpen(false)
            } else {
                toast.error(result.error || "Satış tamamlanamadı")
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        } finally {
            setCheckoutLoading(false)
        }
    }

    const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "SUPERADMIN";

    const returnsList = cart.filter(i => i.quantity < 0);
    const salesList = cart.filter(i => i.quantity > 0);
    const returnsTotal = returnsList.reduce((acc, item) => acc + (item.finalPrice * Math.abs(item.quantity)), 0);
    const salesTotal = salesList.reduce((acc, item) => acc + (item.finalPrice * item.quantity), 0);
    const exchangeBalance = salesTotal - returnsTotal;

    // Price cell component for reuse (old price = badge, clicking restores; new price = input)
    const PriceCell = ({
        item,
        isReturn = false,
        subRowId,
    }: {
        item: CartItem;
        isReturn?: boolean;
        subRowId?: string;
    }) => {
        const isSubRow = !!subRowId;
        const currentFinalPrice = isSubRow
            ? (item.subRows?.find(sr => sr.id === subRowId)?.finalPrice ?? item.finalPrice)
            : item.finalPrice;
        const isDiscounted = item.originalPrice > currentFinalPrice;
        const colorClass = isReturn ? "text-red-700 bg-red-50/50 border-red-200" : isSubRow ? "text-orange-700 bg-orange-50/50 border-orange-200" : "text-indigo-700 bg-indigo-50/50 border-indigo-200";

        return (
            <div className="flex items-center justify-end gap-2">
                {isDiscounted && (
                    <button
                        onClick={() => isSubRow
                            ? restoreSubRowOriginalPrice(item.variantId, subRowId!)
                            : restoreOriginalPrice(item.variantId)
                        }
                        title="Orijinal fiyata geri dön"
                        className="text-sm text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.originalPrice)}
                    </button>
                )}
                <div className="flex items-center gap-1">
                    <Input
                        type="number"
                        value={currentFinalPrice === 0 ? "" : currentFinalPrice}
                        onChange={(e) => isSubRow
                            ? updateSubRowPrice(item.variantId, subRowId!, Number(e.target.value))
                            : updateFinalPrice(item.variantId, Number(e.target.value))
                        }
                        className={cn("w-20 h-8 text-right font-bold", colorClass)}
                    />
                    <span className="text-xs text-muted-foreground">₺</span>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
            {/* Top Section */}
            <div className="flex items-center gap-4 bg-white dark:bg-gray-900 border-b p-4 shadow-sm shrink-0 z-30">

                {/* 1. Customer Panel (Includes Store Name) */}
                <div className="flex-1">
                    <CustomerPanel
                        staffList={staffList}
                        selectedCustomer={selectedCustomer}
                        onCustomerSelect={setSelectedCustomer}
                        storeName={!isAdmin ? storeName : ""}
                        isExchangeMode={isExchangeMode}
                        onExchangeModeChange={(val) => {
                            setIsExchangeMode(val);
                            if (val) setExchangeTarget('INCOMING');
                        }}
                    />
                </div>

                {/* 2. Top Buttons (Quick Transfer & Stock Query) */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setExpenseOpen(true)}
                        className="bg-white hover:bg-orange-50 text-orange-700 border-orange-200 font-semibold h-10 px-4 shadow-sm flex items-center gap-2"
                    >
                        <Coins className="h-4 w-4" />
                        Gider Ekle
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setCashClosingOpen(true)}
                        className="bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold h-10 px-4 shadow-sm flex items-center gap-2"
                    >
                        <Banknote className="h-4 w-4" />
                        Nakit Sayımı
                    </Button>

                    <Button
                        onClick={() => setTransferOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold h-10 px-4 shadow-sm"
                    >
                        <Truck className="mr-2 h-4 w-4" />
                        Hızlı Transfer
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setStockQueryOpen(true)}
                            className="bg-sky-500 hover:bg-sky-600 text-white font-semibold h-10 px-4 shadow-sm"
                        >
                            <SearchIcon className="mr-2 h-4 w-4" />
                            Stok Sor
                        </Button>
                    </div>
                </div>

                {/* Admin Store Selector */}
                {isAdmin && stores && stores.length > 0 && (
                    <div className="w-[180px]">
                        <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                            <SelectTrigger className="h-10 border-indigo-200 focus:ring-indigo-500">
                                <SelectValue placeholder="Mağaza Seç" />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map(store => (
                                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Main Grid */}
            <div className="flex-1 overflow-hidden p-4 max-w-[1600px] mx-auto w-full flex flex-col gap-4">

                {/* Search Bar - Global for both modes */}
                <div className="shrink-0 z-20 flex flex-col gap-2">
                    <ProductSearch
                        onSelect={addToCart}
                        storeId={(isExchangeMode && exchangeTarget === 'INCOMING') ? undefined : selectedStoreId}
                        includeOutOfStock={isExchangeMode && exchangeTarget === 'INCOMING'}
                    />

                    {/* Target Switcher for Exchange Mode */}
                    {isExchangeMode && (
                        <div className="flex gap-4 animate-in slide-in-from-top-2">
                            <div
                                onClick={() => setExchangeTarget('INCOMING')}
                                className={cn("flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between",
                                    exchangeTarget === 'INCOMING'
                                        ? "bg-red-50 border-red-500 shadow-sm"
                                        : "bg-white border-transparent hover:bg-gray-50 opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-2 font-bold text-red-700">
                                    <RefreshCw className="h-5 w-5" />
                                    GELEN ÜRÜN (İADE)
                                </div>
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">Buraya Ekleniyor</span>
                            </div>

                            <div
                                onClick={() => setExchangeTarget('OUTGOING')}
                                className={cn("flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between",
                                    exchangeTarget === 'OUTGOING'
                                        ? "bg-green-50 border-green-500 shadow-sm"
                                        : "bg-white border-transparent hover:bg-gray-50 opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-2 font-bold text-green-700">
                                    <ShoppingCart className="h-5 w-5" />
                                    GİDEN ÜRÜN (SATIŞ)
                                </div>
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Buraya Ekleniyor</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Cart Area */}
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-sm border overflow-hidden flex flex-col h-full">
                    {/* Table Area - Conditional Layout */}
                    <div className="flex-1 overflow-auto">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <ShoppingCart className="h-16 w-16 mb-4" />
                                <p>Sepet boş</p>
                            </div>
                        ) : isExchangeMode ? (
                            // SPLIT VIEW FOR EXCHANGE MODE
                            <div className="flex gap-4 h-full p-2">
                                {/* LEFT: INCOMING (RETURNS) */}
                                <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-red-50/30 border-red-100">
                                    <div className="p-2 bg-red-100 text-red-800 font-bold text-center border-b border-red-200 flex items-center justify-center gap-2">
                                        <RefreshCw className="h-4 w-4" />
                                        İADE EDİLENLER (GELEN)
                                        <span className="ml-2 text-xs bg-white/50 px-2 py-0.5 rounded-full">{returnsList.length} Ürün</span>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="w-[50%]">Ürün</TableHead>
                                                    <TableHead className="text-right">Fiyat</TableHead>
                                                    <TableHead className="text-center">Adet</TableHead>
                                                    <TableHead className="text-right">Tutar</TableHead>
                                                    <TableHead className="w-[40px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {returnsList.map(item => (
                                                    <TableRow key={item.variantId} className="hover:bg-red-50/50">
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm">{item.modelName}</span>
                                                                <span className="text-xs text-muted-foreground">{item.barcode} • {item.color}/{item.size}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-sm">
                                                            <PriceCell item={item} isReturn={true} />
                                                        </TableCell>
                                                        <TableCell className="text-center p-1">
                                                            <div className="flex items-center justify-center gap-1 scale-90">
                                                                <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.variantId, item.quantity - 1)} disabled={Math.abs(item.quantity) <= 1}>-</Button>
                                                                <span className="w-6 text-center font-bold text-sm">{Math.abs(item.quantity)}</span>
                                                                <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>+</Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-sm text-red-600">
                                                            -{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price * Math.abs(item.quantity))}
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <Trash2 className="h-4 w-4 text-red-400 hover:text-red-700 cursor-pointer" onClick={() => removeFromCart(item.variantId)} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {returnsList.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                                            Henüz iade ürün eklenmedi
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                {/* RIGHT: OUTGOING (SALES) */}
                                <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-green-50/30 border-green-100">
                                    <div className="p-2 bg-green-100 text-green-800 font-bold text-center border-b border-green-200 flex items-center justify-center gap-2">
                                        <ShoppingCart className="h-4 w-4" />
                                        YENİ ÜRÜNLER (GİDEN)
                                        <span className="ml-2 text-xs bg-white/50 px-2 py-0.5 rounded-full">{salesList.length} Ürün</span>
                                    </div>
                                    <div className="flex-1 overflow-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="w-[50%]">Ürün</TableHead>
                                                    <TableHead className="text-right">Fiyat</TableHead>
                                                    <TableHead className="text-center">Adet</TableHead>
                                                    <TableHead className="text-right">Tutar</TableHead>
                                                    <TableHead className="w-[40px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {salesList.map(item => (
                                                    <TableRow key={item.variantId} className="hover:bg-green-50/50">
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-sm">{item.modelName}</span>
                                                                <span className="text-xs text-muted-foreground">{item.barcode} • {item.color}/{item.size} • Stok: {item.stock}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium text-sm">
                                                            <PriceCell item={item} />
                                                        </TableCell>
                                                        <TableCell className="text-center p-1">
                                                            <div className="flex items-center justify-center gap-1 scale-90">
                                                                <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.variantId, item.quantity - 1)} disabled={Math.abs(item.quantity) <= 1}>-</Button>
                                                                <span className="w-6 text-center font-bold text-sm">{Math.abs(item.quantity)}</span>
                                                                <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>+</Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-sm text-green-600">
                                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(item.price * item.quantity)}
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <Trash2 className="h-4 w-4 text-red-400 hover:text-red-700 cursor-pointer" onClick={() => removeFromCart(item.variantId)} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {salesList.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                                                            Henüz yeni ürün eklenmedi
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // STANDARD SALES VIEW
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[38%]">Ürün</TableHead>
                                        <TableHead className="w-[22%] text-left">Satış Temsilcisi</TableHead>
                                        <TableHead className="text-right">Fiyat</TableHead>
                                        <TableHead className="text-center w-[140px]">Adet</TableHead>
                                        <TableHead className="text-right">Tutar</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.map(item => (
                                        <React.Fragment key={item.variantId}>
                                            {/* Main cart row */}
                                            <TableRow className={cn(item.isExpanded && "bg-indigo-50/30 dark:bg-indigo-950/20")}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">{item.modelName}</span>
                                                        <span className="text-xs text-muted-foreground">{item.barcode} • {item.color}/{item.size} • Stok: {item.stock}</span>
                                                        {campaignDiscounts.some(d => d.matchedItemIds.includes(item.variantId)) && (
                                                            <span className="text-[10px] text-green-600 flex items-center gap-1 mt-0.5 font-bold">
                                                                <Tag className="w-3 h-3" />
                                                                Kampanyalı Ürün
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    <Select
                                                        value={item.salesRepId || ""}
                                                        onValueChange={(val) => updateSalesRep(item.variantId, val)}
                                                    >
                                                        <SelectTrigger className="h-8 border-gray-200 bg-gray-50/50">
                                                            <SelectValue placeholder="Personel Seç" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {filteredStaffList.map(staff => (
                                                                <SelectItem key={staff.id} value={staff.id}>
                                                                    {staff.name || staff.username}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>

                                                <TableCell className="text-right font-medium">
                                                    {item.isExpanded ? (
                                                        <span className="text-xs text-muted-foreground italic">Aşağıda ayrı ayrı</span>
                                                    ) : (
                                                        <PriceCell item={item} />
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.variantId, item.quantity - 1)} disabled={Math.abs(item.quantity) <= 1}>-</Button>
                                                        <span className="w-8 text-center font-bold">{Math.abs(item.quantity)}</span>
                                                        <Button variant="outline" size="sm" className="h-6 w-6 p-0" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>+</Button>
                                                        {/* Expand toggle - only when qty > 1 */}
                                                        {item.quantity > 1 && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                                                                onClick={() => toggleExpand(item.variantId)}
                                                                title={item.isExpanded ? "Satırları birleştir" : "Her adet için ayrı fiyat belirle"}
                                                            >
                                                                {item.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>

                                                <TableCell className="text-right font-bold">
                                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                                                        item.isExpanded && item.subRows
                                                            ? item.subRows.reduce((a, sr) => a + sr.finalPrice, 0)
                                                            : item.finalPrice * item.quantity
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Trash2 className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700" onClick={() => removeFromCart(item.variantId)} />
                                                </TableCell>
                                            </TableRow>

                                            {/* Expanded sub-rows: one per unit with its own price */}
                                            {item.isExpanded && item.subRows && item.subRows.map((sr, idx) => (
                                                <TableRow key={sr.id} className="bg-orange-50/20 dark:bg-orange-950/10 border-l-4 border-l-orange-300">
                                                    <TableCell colSpan={2} className="py-1.5 pl-8">
                                                        <span className="text-xs text-muted-foreground font-medium">
                                                            {idx + 1}. adet — {item.color} / {item.size}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right py-1.5">
                                                        <PriceCell item={item} subRowId={sr.id} />
                                                    </TableCell>
                                                    <TableCell className="text-center py-1.5">
                                                        <span className="text-xs text-muted-foreground">1 adet</span>
                                                    </TableCell>
                                                    <TableCell className="text-right py-1.5 font-bold text-sm">
                                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(sr.finalPrice)}
                                                    </TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>

                    {/* Footer Totals */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t space-y-4">
                        <div className="flex justify-between items-end">
                            <div className="text-muted-foreground text-sm">
                                {!isExchangeMode ? (
                                    <>
                                        <div>Ara Toplam: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount)}</div>
                                        <div>KDV (%10 Dahil): {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount > 0 ? totalAmount * 0.1 : 0)}</div>
                                    </>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="text-red-600">İade Toplam: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(returnsTotal)}</div>
                                        <div className="text-green-600">Satış Toplam: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(salesTotal)}</div>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-muted-foreground mb-1">
                                    {!isExchangeMode ? "GENEL TOPLAM" : "ÖDENECEK FARK"}
                                </div>

                                {isExchangeMode && exchangeBalance <= 0 ? (
                                    <div className="text-3xl font-black tracking-tight text-gray-400">
                                        0,00 ₺
                                    </div>
                                ) : (
                                    <div className={cn("text-4xl font-black tracking-tight", totalAmount < 0 ? "text-red-600" : "text-indigo-600")}>
                                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(isExchangeMode ? exchangeBalance : (totalAmount - totalCampaignDiscount))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Campaign Discount Info */}
                        {totalCampaignDiscount > 0 && !isExchangeMode && (
                            <div className="flex justify-between items-center text-green-600 bg-green-50 p-2 rounded-md animate-pulse">
                                <span className="flex items-center gap-1 font-semibold">
                                    <Tag className="w-4 h-4" />
                                    Kampanya İndirimi Uygulandı
                                </span>
                                <span className="font-bold">-{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalCampaignDiscount)}</span>
                            </div>
                        )}

                        <div className="h-14">
                            <Button
                                className={cn("w-full h-full text-xl font-bold shadow-lg dark:shadow-none transition-colors",
                                    (isExchangeMode && exchangeBalance <= 0)
                                        ? "bg-green-600 hover:bg-green-700 shadow-green-200"
                                        : totalAmount < 0
                                            ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
                                            : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                                )}
                                onClick={handleOpenPayment}
                                disabled={checkoutLoading || cart.length === 0}
                            >
                                {checkoutLoading ? <Loader2 className="animate-spin mr-2" /> : <Banknote className="mr-2 h-6 w-6" />}

                                {/* BUTTON TEXT LOGIC */}
                                {!isExchangeMode ? (
                                    totalAmount < 0 ? "DEĞİŞİMİ TAMAMLA (İADESİZ)" : "ÖDEME AL"
                                ) : (
                                    // Exchange Mode
                                    exchangeBalance <= 0
                                        ? "İŞLEMİ TAMAMLA"
                                        : "ÖDEME AL (FARK TAHSİLATI)"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialogs */}
            <StoreExpenseDialog
                open={expenseOpen}
                onOpenChange={setExpenseOpen}
                storeId={selectedStoreId}
            />

            <CashClosingDialog
                open={cashClosingOpen}
                onOpenChange={setCashClosingOpen}
                storeId={selectedStoreId}
                staffId={filteredStaffList[0]?.id || ""} // Fallback to first staff if not tracked
            />

            <PaymentDialog
                open={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
                totalAmount={totalAmount - totalCampaignDiscount}
                onComplete={handleCompletePayment}
                isLoading={checkoutLoading}
                customer={selectedCustomer}
            />

            <StockQueryDialog
                open={stockQueryOpen}
                onOpenChange={setStockQueryOpen}
            />

            <QuickTransferDialog
                open={transferOpen}
                onOpenChange={setTransferOpen}
                currentStoreId={selectedStoreId}
                allStores={stores || []}
                currentStaffId={filteredStaffList[0]?.id || ""}
            />

            {/* Success Dialog */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-md bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <DialogHeader>
                        <DialogTitle className="flex flex-col items-center gap-4 text-center pt-4">
                            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-300">
                                <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <span className="text-2xl text-green-700 dark:text-green-300">Satış Başarılı!</span>
                        </DialogTitle>
                        <DialogDescription className="text-center text-green-600/80 dark:text-green-400">
                            İşlem başarıyla kaydedildi ve stoktan düşüldü.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-center gap-2 pb-4">
                        <Button
                            variant="outline"
                            className="border-green-200 text-green-700 hover:bg-green-100"
                            onClick={() => {
                                if (lastSaleId) {
                                    window.open(`/pos/receipt/${lastSaleId}`, 'Receipt', 'width=400,height=600')
                                }
                            }}
                        >
                            <Receipt className="mr-2 h-4 w-4" />
                            Bilgi Fişi Yazdır
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowSuccessDialog(false)}>
                            Yeni Satış
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receipt Preview Dialog */}
            <Dialog open={!!receiptUrl} onOpenChange={(open) => !open && setReceiptUrl(null)}>
                <DialogContent className="max-w-[400px] h-[80vh] p-0 overflow-hidden bg-white">
                    {receiptUrl && (
                        <iframe
                            src={receiptUrl}
                            className="w-full h-full border-0"
                            title="Receipt Preview"
                        />
                    )}
                </DialogContent>
            </Dialog>

        </div>
    )
}
