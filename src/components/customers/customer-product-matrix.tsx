"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

import type { MatrixData } from "@/types/customer"

export function CustomerProductMatrix({ data }: { data: MatrixData }) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Müşteri Profili</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                    Mağaza Tercihi: <span className="font-bold text-gray-900">{data.preferredStore || "-"}</span>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Favorites Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Favori Renk</span>
                        <div className="font-bold text-sm border p-2 rounded-md bg-gray-50 text-center truncate" title={data.favoriteColor}>
                            {data.favoriteColor || "-"}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Favori Beden</span>
                        <div className="font-bold text-sm border p-2 rounded-md bg-gray-50 text-center truncate" title={data.favoriteSize}>
                            {data.favoriteSize || "-"}
                        </div>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <span className="text-xs text-muted-foreground">Favori Marka</span>
                        <div className="font-bold text-sm border p-2 rounded-md bg-gray-50 text-center truncate" title={data.favoriteBrand}>
                            {data.favoriteBrand || "-"}
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="space-y-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Kategori Dağılımı</span>
                    {data.topCategories.length === 0 && <div className="text-xs text-muted-foreground italic">Veri yok</div>}
                    {data.topCategories.map((cat, idx) => (
                        <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="font-medium">{cat.name}</span>
                                <span className="text-muted-foreground">%{cat.percentage.toFixed(0)}</span>
                            </div>
                            <Progress value={cat.percentage} className="h-2" />
                        </div>
                    ))}
                </div>

            </CardContent>
        </Card>
    )
}
