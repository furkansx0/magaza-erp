"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, ChevronRight, Phone, MapPin } from "lucide-react"
import { SupplierWithBalance } from "@/actions/finance/finance-actions"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function SupplierList({ data }: { data: SupplierWithBalance[] }) {
    const router = useRouter()
    const [search, setSearch] = useState("")

    const filtered = data.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="space-y-4">
            <div className="flex items-center relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Firma ara..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50">
                        <TableRow>
                            <TableHead className="w-[300px]">Firma Adı</TableHead>
                            <TableHead>İletişim</TableHead>
                            <TableHead className="text-right">Güncel Bakiye</TableHead>
                            <TableHead className="text-right">Vadesi Geçmiş</TableHead>
                            <TableHead className="text-right">Gelecek Ay</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    Kayıt bulunamadı.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((supplier) => (
                                <TableRow
                                    key={supplier.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => router.push(`/dashboard/finance/supplier/${supplier.id}`)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-base text-gray-900">{supplier.name}</span>
                                            {supplier.address && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                    <MapPin className="h-3 w-3" /> {supplier.address}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {supplier.phone ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="h-3 w-3" /> {supplier.phone}
                                            </div>
                                        ) : "-"}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-gray-900">
                                        {supplier.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {supplier.overdue > 0 ? (
                                            <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded text-xs">
                                                {supplier.overdue.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-gray-600">
                                        {supplier.upcoming.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="text-xs text-gray-400 text-center">
                Toplam {filtered.length} firma listeleniyor. detay görmek için satıra tıklayın.
            </div>
        </div>
    )
}
