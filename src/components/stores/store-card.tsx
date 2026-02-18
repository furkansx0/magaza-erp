"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone, User as UserIcon } from "lucide-react"
import Link from "next/link"
import { StoreManagerDialog } from "./store-manager-dialog"
import { useState } from "react"

interface StoreCardProps {
    store: {
        id: string
        name: string
        location: string | null
        phone: string | null
        _count: {
            users: number
            sales: number
        }
        manager: {
            id: string
            name: string | null
            username: string
            phone: string | null
        } | null
    }
}

export function StoreCard({ store }: StoreCardProps) {
    return (
        <Card className="flex flex-col relative overflow-hidden group">
            {/* Manager Box - Top Right */}
            <div className="absolute top-2 right-2 z-10">
                <StoreManagerDialog storeId={store.id} currentManager={store.manager}>
                    <div className="bg-white/90 backdrop-blur border shadow-sm rounded-lg p-2 cursor-pointer hover:bg-gray-50 transition-colors text-xs border-l-4 border-l-blue-500 max-w-[150px]">
                        <div className="font-bold text-gray-800 flex items-center gap-1 truncate">
                            <UserIcon className="h-3 w-3" />
                            {store.manager?.name || "Müdür Atanmadı"}
                        </div>
                        <div className="text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                            <Phone className="h-3 w-3" />
                            {store.manager?.phone || "-"}
                        </div>
                    </div>
                </StoreManagerDialog>
            </div>

            <CardHeader className="pb-2 pt-6">
                <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2">
                        {store.name}
                    </CardTitle>
                </div>
                <CardDescription className="line-clamp-1 h-5">
                    {store.location || "Konum belirtilmedi"}
                </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {store.phone || "-"}
                </div>
                <div className="flex gap-4 pt-2 border-t mt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Personel</span>
                        <span className="text-xl font-bold text-gray-700">{store._count.users}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">İşlem</span>
                        <span className="text-xl font-bold text-gray-700">{store._count.sales}</span>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="pt-2">
                <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 text-white" variant="default">
                    <Link href={`/dashboard/stores/${store.id}`}>
                        Yönet ve Raporlar
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    )
}
