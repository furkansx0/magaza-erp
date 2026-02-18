"use client"

import * as React from "react"
import * as XLSX from "xlsx"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw, Printer, Filter, X, Check, Building2, User as UserIcon } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

export type CustomerGridRow = {
    id: string
    name: string
    phone: string
    email: string
    city: string
    district: string
    type: "INDIVIDUAL" | "CORPORATE"
    gender: string
    salesCount: number
    totalSpent: number
    lastPurchaseDate: Date | null
    createdAt: Date
    [key: string]: any
}

interface CustomerGridProps {
    data: CustomerGridRow[]
}

function MultiSelectFilter({
    title,
    options,
    selected,
    onChange
}: {
    title: string
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
}) {
    const [search, setSearch] = React.useState("")
    const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed text-xs px-2 w-full justify-start font-normal bg-gray-50 border-gray-300">
                    <Filter className="mr-2 h-3 w-3" />
                    {title}
                    {selected.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <div className="hidden space-x-1 lg:flex">
                                {selected.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal text-[10px] h-5">
                                        {selected.length} seçili
                                    </Badge>
                                ) : (
                                    selected.map((option) => (
                                        <Badge
                                            variant="secondary"
                                            key={option}
                                            className="rounded-sm px-1 font-normal text-[10px] h-5"
                                        >
                                            {option}
                                        </Badge>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2 pb-2">
                    <Input
                        placeholder="Ara..."
                        className="h-8 text-xs"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="max-h-[200px] overflow-auto p-1 space-y-1">
                    {filteredOptions.length === 0 && <div className="text-center text-xs p-2 text-gray-500">Sonuç yok.</div>}
                    {filteredOptions.map(option => {
                        const isSelected = selected.includes(option)
                        return (
                            <div
                                key={option}
                                className={cn(
                                    "flex items-center space-x-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                    isSelected && "bg-accent"
                                )}
                                onClick={() => {
                                    if (isSelected) {
                                        onChange(selected.filter(s => s !== option))
                                    } else {
                                        onChange([...selected, option])
                                    }
                                }}
                            >
                                <div className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                )}>
                                    <Check className="h-3 w-3" />
                                </div>
                                <span className="text-xs flex-1 truncate">{option}</span>
                            </div>
                        )
                    })}
                </div>
                {selected.length > 0 && (
                    <>
                        <Separator />
                        <div className="p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-[10px] h-7"
                                onClick={() => onChange([])}
                            >
                                Temizle
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    )
}

export function CustomerGridView({ data }: CustomerGridProps) {
    const parentRef = React.useRef<HTMLDivElement>(null)
    const router = useRouter()

    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [searchTerm, setSearchTerm] = React.useState("")
    const [filteredData, setFilteredData] = React.useState(data)
    const [sortOption, setSortOption] = React.useState("default")

    // Filter States
    const uniqueCities = React.useMemo(() => Array.from(new Set(data.map(r => r.city).filter(Boolean))).sort(), [data])
    const uniqueDistricts = React.useMemo(() => Array.from(new Set(data.map(r => r.district).filter(Boolean))).sort(), [data])
    const uniqueTypes = React.useMemo(() => Array.from(new Set(data.map(r => r.type).filter(Boolean))).sort(), [data])

    const [selectedCities, setSelectedCities] = React.useState<string[]>([])
    const [selectedDistricts, setSelectedDistricts] = React.useState<string[]>([])
    const [selectedTypes, setSelectedTypes] = React.useState<string[]>([])

    React.useEffect(() => {
        let filtered = [...data]

        if (searchTerm) {
            const lower = searchTerm.toLowerCase()
            filtered = filtered.filter(r =>
                r.name.toLowerCase().includes(lower) ||
                (r.phone && r.phone.includes(lower)) ||
                (r.email && r.email.toLowerCase().includes(lower))
            )
        }

        if (selectedCities.length > 0) filtered = filtered.filter(r => selectedCities.includes(r.city))
        if (selectedDistricts.length > 0) filtered = filtered.filter(r => selectedDistricts.includes(r.district))
        if (selectedTypes.length > 0) filtered = filtered.filter(r => selectedTypes.includes(r.type))

        // Sorting
        filtered.sort((a, b) => {
            if (sortOption === "name_asc") return a.name.localeCompare(b.name)
            if (sortOption === "name_desc") return b.name.localeCompare(a.name)
            if (sortOption === "spent_desc") return b.totalSpent - a.totalSpent
            if (sortOption === "spent_asc") return a.totalSpent - b.totalSpent
            if (sortOption === "date_newest") return b.createdAt.getTime() - a.createdAt.getTime()
            if (sortOption === "date_oldest") return a.createdAt.getTime() - b.createdAt.getTime()
            if (sortOption === "last_purchase") {
                const dateA = a.lastPurchaseDate ? a.lastPurchaseDate.getTime() : 0;
                const dateB = b.lastPurchaseDate ? b.lastPurchaseDate.getTime() : 0;
                return dateB - dateA;
            }
            // Default: Creation date desc
            return b.createdAt.getTime() - a.createdAt.getTime()
        })

        setFilteredData(filtered)
    }, [searchTerm, selectedCities, selectedDistricts, selectedTypes, sortOption, data])

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredData.length) setSelectedIds([])
        else setSelectedIds(filteredData.map(r => r.id))
    }
    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(i => i !== id))
        else setSelectedIds(prev => [...prev, id])
    }

    const handleExportExcel = () => {
        if (filteredData.length === 0) return toast.error("Dışarı aktarılacak veri yok.");

        const exportData = filteredData.map(row => ({
            "Ad Soyad": row.name,
            "Telefon": row.phone,
            "Tip": row.type === 'CORPORATE' ? 'Kurumsal' : 'Bireysel',
            "Şehir": row.city,
            "İlçe": row.district,
            "Toplam Harcama": row.totalSpent,
            "Satış Adedi": row.salesCount,
            "Son Alışveriş": row.lastPurchaseDate ? row.lastPurchaseDate.toLocaleDateString('tr-TR') : '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Müşteri Listesi");
        const wscols = Object.keys(exportData[0]).map(k => ({ wch: 20 }));
        worksheet['!cols'] = wscols;
        const dateStr = new Date().toLocaleDateString('tr-TR').replace(/\./g, '-');
        XLSX.writeFile(workbook, `Musteri_Listesi_${dateStr}.xlsx`);
        toast.success(`${exportData.length} müşteri Excel'e aktarıldı.`);
    }

    const rowVirtualizer = useVirtualizer({
        count: filteredData.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 35,
        overscan: 20
    })

    const handleRowClick = (id: string, e: React.MouseEvent) => {
        // Prevent navigation if clicking checkbox or action buttons
        if ((e.target as HTMLElement).closest('.no-nav')) return;
        router.push(`/dashboard/customers/${id}`);
    }

    return (
        <div className="flex flex-col h-full bg-gray-100 p-2 gap-2 text-xs">
            {/* Top Filter Bar */}
            <div className="bg-white border rounded shadow-sm p-3 gap-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* Filter Section */}
                    <div className="space-y-1 md:col-span-3">
                        <Label className="text-[10px] uppercase font-bold text-gray-500">Sıralama</Label>
                        <Select value={sortOption} onValueChange={setSortOption}>
                            <SelectTrigger className="h-8 text-xs bg-gray-50"><SelectValue placeholder="Sıralama" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="default">Varsayılan (Tarih)</SelectItem>
                                <Separator className="my-1" />
                                <SelectItem value="name_asc">İsim (A-Z)</SelectItem>
                                <SelectItem value="name_desc">İsim (Z-A)</SelectItem>
                                <Separator className="my-1" />
                                <SelectItem value="spent_desc">En Çok Harcayan</SelectItem>
                                <SelectItem value="spent_asc">En Az Harcayan</SelectItem>
                                <Separator className="my-1" />
                                <SelectItem value="last_purchase">Son Alışverişe Göre</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1 md:col-span-5">
                        <Label className="text-[10px] uppercase font-bold text-gray-500">Hızlı Arama</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2 h-4 w-4 text-gray-400" />
                            <Input
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 pl-8 text-xs bg-yellow-50 border-yellow-200"
                                placeholder="Ad, Telefon, E-posta..."
                            />
                        </div>
                    </div>
                </div>

                {/* Facet Filters */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                    <MultiSelectFilter title="Şehir" options={uniqueCities as string[]} selected={selectedCities} onChange={setSelectedCities} />
                    <MultiSelectFilter title="İlçe" options={uniqueDistricts as string[]} selected={selectedDistricts} onChange={setSelectedDistricts} />
                    <MultiSelectFilter title="Müşteri Tipi" options={uniqueTypes as string[]} selected={selectedTypes} onChange={setSelectedTypes} />

                    <Button variant="outline" size="sm" className="h-8 border-dashed text-xs px-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                        setSearchTerm(""); setSelectedCities([]); setSelectedDistricts([]); setSelectedTypes([]); setSortOption("default");
                    }}>
                        <X className="mr-2 h-3 w-3" />
                        Filtreleri Temizle
                    </Button>
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex gap-1 overflow-x-auto bg-gray-200 p-1 rounded-t-md border-b-0 items-center">
                <Button variant="secondary" size="sm" onClick={() => router.refresh()} className="h-7 text-xs bg-white hover:text-blue-600">
                    <RefreshCw className="w-3 h-3 mr-1" /> Yenile
                </Button>

                <div className="w-[1px] h-4 bg-gray-300 my-auto mx-1" />

                <Button variant="ghost" size="sm" onClick={handleExportExcel} className="h-7 text-xs hover:bg-white hover:text-green-700 text-green-700 bg-green-50/50 border border-green-200/50">
                    <Filter className="w-3 h-3 mr-1" /> Excel'e Aktar
                </Button>

                <Button variant="ghost" size="sm" onClick={() => window.print()} className="h-7 text-xs hover:bg-white">
                    <Printer className="w-3 h-3 mr-1" /> Yazdır
                </Button>

                <div className="flex-1" />


            </div>

            {/* Grid */}
            <div ref={parentRef} className="flex-1 border bg-white rounded-b-md shadow-inner overflow-auto relative" style={{ contain: 'strict' }}>
                <div className="w-full relative" style={{ height: `${rowVirtualizer.getTotalSize() + 45}px` }}>
                    {/* Header - Columns adapted for Customers */}
                    <div className="sticky top-0 z-30 grid bg-gray-100 border-b shadow-sm font-bold text-gray-600 select-none items-center h-[45px]"
                        style={{
                            gridTemplateColumns: `40px 250px 120px 120px 100px 100px 70px 120px 120px 120px`,
                            width: 'max-content',
                            minWidth: '100%'
                        }}
                    >
                        <div className="p-2 border-r text-center flex justify-center sticky left-0 z-40 bg-gray-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                            <Checkbox checked={filteredData.length > 0 && selectedIds.length === filteredData.length} onCheckedChange={toggleSelectAll} className="h-3 w-3" />
                        </div>
                        <div className="p-2 border-r">Müşteri Adı</div>
                        <div className="p-2 border-r">Telefon</div>
                        <div className="p-2 border-r">Şehir</div>
                        <div className="p-2 border-r">İlçe</div>
                        <div className="p-2 border-r">Tip</div>
                        <div className="p-2 border-r text-center">İşlem</div>
                        <div className="p-2 border-r text-right">Toplam Harcama</div>
                        <div className="p-2 border-r text-right">Son Alışveriş</div>
                        <div className="p-2 border-r text-center">Kayıt Tarihi</div>
                    </div>

                    {/* Rows */}
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = filteredData[virtualRow.index]
                        return (
                            <div key={row.id}
                                onClick={(e) => handleRowClick(row.id, e)}
                                className={cn("absolute top-0 left-0 grid hover:bg-blue-50 transition-colors items-center border-b cursor-pointer whitespace-nowrap", virtualRow.index % 2 === 0 ? "bg-white" : "bg-gray-50/50")}
                                style={{
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start + 45}px)`,
                                    gridTemplateColumns: `40px 250px 120px 120px 100px 100px 70px 120px 120px 120px`,
                                    width: 'max-content',
                                    minWidth: '100%'
                                }}
                            >
                                <div className="no-nav px-2 border-r h-full flex items-center justify-center sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] bg-inherit">
                                    <Checkbox checked={selectedIds.includes(row.id)} onCheckedChange={() => toggleSelect(row.id)} className="h-3 w-3" />
                                </div>
                                <div className="px-2 border-r h-full flex items-center font-medium text-blue-900">{row.name}</div>
                                <div className="px-2 border-r h-full flex items-center font-mono text-[10px] text-gray-600">{row.phone || "-"}</div>
                                <div className="px-2 border-r h-full flex items-center text-gray-600">{row.city || "-"}</div>
                                <div className="px-2 border-r h-full flex items-center text-gray-600">{row.district || "-"}</div>
                                <div className="px-2 border-r h-full flex items-center">
                                    {row.type === 'CORPORATE' ? (
                                        <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200">
                                            <Building2 className="w-3 h-3 mr-1" /> Kurumsal
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[9px] bg-gray-50 text-gray-600 border-gray-200">
                                            <UserIcon className="w-3 h-3 mr-1" /> Bireysel
                                        </Badge>
                                    )}
                                </div>
                                <div className="px-2 border-r h-full flex items-center justify-center font-mono">{row.salesCount}</div>
                                <div className="px-2 border-r h-full flex items-center justify-end font-mono font-bold text-green-700 bg-green-50/30">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(row.totalSpent)}
                                </div>
                                <div className="px-2 border-r h-full flex items-center justify-end text-[10px] text-gray-500">
                                    {row.lastPurchaseDate ? row.lastPurchaseDate.toLocaleDateString('tr-TR') : '-'}
                                </div>
                                <div className="px-2 border-r h-full flex items-center justify-center text-[10px] text-gray-400">
                                    {row.createdAt.toLocaleDateString('tr-TR')}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Footer Status */}
            <div className="bg-white border p-1 text-[10px] text-gray-500 flex justify-between shadow-sm rounded-sm">
                <div>Toplam Müşteri: <strong>{filteredData.length}</strong></div>
                <div>Seçili: <strong>{selectedIds.length}</strong></div>
            </div>
        </div>
    )
}
