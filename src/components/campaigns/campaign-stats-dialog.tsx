"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { BarChart3, Loader2, Users, Wallet } from "lucide-react"
import { getCampaignStats } from "@/actions/crm/campaign-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CampaignStatsDialog({ campaignId, campaignName }: { campaignId: string, campaignName: string }) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)
    const [stats, setStats] = React.useState<{ definedCount: number, usedCount: number, totalDiscount: number, netRevenue: number } | null>(null)

    React.useEffect(() => {
        if (open) {
            setLoading(true)
            getCampaignStats(campaignId).then(data => {
                setStats(data)
                setLoading(false)
            })
        }
    }, [open, campaignId])

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600">
                    <BarChart3 className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{campaignName} - Rapor</DialogTitle>
                    <DialogDescription>
                        Kampanya performans verileri
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Card className="bg-muted/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Tanımlanan</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.definedCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Kişiye hediye çeki verildi
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Kullanılan</CardTitle>
                                <Users className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.usedCount}</div>
                                <p className="text-xs text-muted-foreground">
                                    Kişi çeki alışverişte kullandı
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Toplam İndirim</CardTitle>
                                <Wallet className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">-{stats.totalDiscount.toLocaleString('tr-TR')} ₺</div>
                                <p className="text-xs text-muted-foreground">
                                    Kampanya maliyeti
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="bg-green-50 border-green-200">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium uppercase text-green-700">Net Kasa Girişi</CardTitle>
                                <Wallet className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-700">{stats.netRevenue.toLocaleString('tr-TR')} ₺</div>
                                <p className="text-xs text-green-600/80">
                                    Kampanya sonrası tahsilat
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    )
}
