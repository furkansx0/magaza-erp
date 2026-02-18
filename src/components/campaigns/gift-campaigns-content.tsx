"use client"

import { Campaign } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Calendar, Target, Gift, Play } from "lucide-react"
import { CampaignStatsDialog } from "@/components/campaigns/campaign-stats-dialog"
import { RunCampaignButton } from "@/components/campaigns/run-campaign-button"
import { DeleteCampaignButton } from "@/components/campaigns/delete-campaign-button"

interface GiftCampaignsContentProps {
    campaigns: (Campaign & { _count: { logs: number } })[]
}

export function GiftCampaignsContent({ campaigns }: GiftCampaignsContentProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Aktif Kampanyalar</CardTitle>
                <CardDescription>
                    Müşterilerinize özel günlerde veya belirli durumlarda otomatik hediye çeki tanımlayın.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kampanya Adı</TableHead>
                            <TableHead>Tetikleyici</TableHead>
                            <TableHead>Hedef Kitle</TableHead>
                            <TableHead>Ödül</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {campaigns.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    Henüz hiç kampanya oluşturulmadı.
                                </TableCell>
                            </TableRow>
                        )}
                        {campaigns.map((campaign) => (
                            <TableRow key={campaign.id}>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{campaign.name}</span>
                                        <span className="text-xs text-muted-foreground">{campaign.description}</span>
                                        <span className="text-[10px] text-blue-600 font-semibold mt-1">
                                            {campaign._count.logs} Kişiye Tanımlandı
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {campaign.triggerType === "BIRTHDAY" && <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" /> Doğum Günü</Badge>}
                                        {campaign.triggerType === "DATE" && <Badge variant="outline"><Calendar className="w-3 h-3 mr-1" /> Özel Tarih</Badge>}
                                        {campaign.triggerType === "MANUAL" && <Badge variant="outline"><Play className="w-3 h-3 mr-1" /> Manuel</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm space-y-1">
                                        {campaign.targetGender !== "ALL" && <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {campaign.targetGender === "MALE" ? "Erkekler" : "Kadınlar"}</span>}
                                        {campaign.targetCity && <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {campaign.targetCity}</span>}
                                        {campaign.targetType !== "ALL" && <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {campaign.targetType === "INDIVIDUAL" ? "Bireysel" : "Kurumsal"}</span>}
                                        {campaign.targetGender === "ALL" && !campaign.targetCity && campaign.targetType === "ALL" && <span className="text-muted-foreground">Tüm Müşteriler</span>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1 font-semibold text-green-600">
                                        <Gift className="w-4 h-4" />
                                        {campaign.giftPercentage ? `%${campaign.giftPercentage} İndirim` : `${campaign.giftAmount}₺ Çek`}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={campaign.isActive ? "default" : "secondary"}>
                                        {campaign.isActive ? "Aktif" : "Pasif"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <CampaignStatsDialog campaignId={campaign.id} campaignName={campaign.name} />
                                        <RunCampaignButton campaignId={campaign.id} />
                                        <DeleteCampaignButton campaignId={campaign.id} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
