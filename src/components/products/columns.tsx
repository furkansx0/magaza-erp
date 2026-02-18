"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type ProductColumn = {
    id: string
    name: string
    barcode: string
    salePrice: string
    category: string
    stockMerkez: number
    createdAt: string
}

export const columns: ColumnDef<ProductColumn>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Ürün Adı
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
    },
    {
        accessorKey: "barcode",
        header: "Barkod",
    },
    {
        accessorKey: "category",
        header: "Kategori",
    },
    {
        accessorKey: "salePrice",
        header: "Satış Fiyatı",
        cell: ({ row }) => {
            const price = parseFloat(row.getValue("salePrice"))
            const formatted = new Intl.NumberFormat("tr-TR", {
                style: "currency",
                currency: "TRY",
            }).format(price)

            return <div className="font-medium">{formatted}</div>
        },
    },
    {
        accessorKey: "stockMerkez",
        header: "Merkez Stok",
        cell: ({ row }) => {
            const stock = parseInt(row.getValue("stockMerkez"))
            return (
                <div className={stock < 10 ? "text-red-500 font-bold" : "text-green-600"}>
                    {stock} Adet
                </div>
            )
        }
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const payment = row.original

            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={() => navigator.clipboard.writeText(payment.id)}
                        >
                            ID Kopyala
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>Düzenle</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Sil</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    },
]
