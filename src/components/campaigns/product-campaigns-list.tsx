"use client"

import { ProductCampaign } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Edit, Tag, Percent, ShoppingBag } from "lucide-react"
import { deleteProductCampaign, toggleProductCampaignStatus } from "@/actions/crm/campaign-product-actions"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

interface ProductCampaignsListProps {
    campaigns: ProductCampaign[]
}

export function ProductCampaignsList({ campaigns }: ProductCampaignsListProps) {

    const handleDelete = async (id: string) => {
        if (!confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;

        const result = await deleteProductCampaign(id);
        if (result.success) {
            toast.success("Kampanya silindi.");
        } else {
            toast.error(result.error);
        }
    }

    const handleToggle = async (id: string, currentStatus: boolean) => {
        const result = await toggleProductCampaignStatus(id, !currentStatus);
        if (result.success) {
            toast.success(currentStatus ? "Kampanya pasife alındı." : "Kampanya aktif edildi.");
        } else {
            toast.error(result.error);
        }
    }

    const parseRules = (ruleStr: string) => {
        try {
            const rules = JSON.parse(ruleStr);
            // Example rules: { buyQuantity: 0, discountPercent: 20, target: { categoryIds: ["A"], brandIds: ["B"] } }

            let targetText = "";
            const cats = rules.target?.categoryIds || [];
            const brands = rules.target?.brandIds || [];

            // Legacy fallback
            if (rules.target?.type === "ALL") targetText = "Tüm Ürünler";
            else if (rules.target?.type === "CATEGORY" && rules.target.ids) targetText = `Kategori: ${rules.target.ids.join(", ")}`;
            else if (rules.target?.type === "BRAND" && rules.target.ids) targetText = `Marka: ${rules.target.ids.join(", ")}`;

            // New Format
            if (cats.length > 0 && brands.length > 0) {
                targetText = `${cats.join(", ")} kategorisindeki ${brands.join(", ")} ürünleri`;
            } else if (cats.length > 0) {
                targetText = `Kategori: ${cats.join(", ")}`;
            } else if (brands.length > 0) {
                targetText = `Marka: ${brands.join(", ")}`;
            } else {
                if (!targetText) targetText = "Tüm Ürünler";
            }

            let benefitText = "";
            if (rules.buyQuantity === 0) {
                benefitText = `Doğrudan %${rules.discountPercent} İndirim`;
            } else {
                if (rules.discountPercent === 100) benefitText = `${rules.buyQuantity} Al ${rules.getQuantity} Bedava`;
                else benefitText = `${rules.buyQuantity} Alana ${rules.getQuantity}. Ürün %${rules.discountPercent} İndirimli`;
            }

            return { targetText, benefitText };
        } catch (e) {
            return { targetText: "Hata", benefitText: "Kural Okunamadı" };
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ürün Kampanyaları</CardTitle>
                <CardDescription>
                    Ürün bazlı indirimler (1 Alana 1 Bedava, 2. Ürün %50 İndirim vb.)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kampanya Adı</TableHead>
                            <TableHead>Tip</TableHead>
                            <TableHead>Hedef</TableHead>
                            <TableHead>Kural</TableHead>
                            <TableHead>Mağazalar</TableHead>
                            <TableHead>Durum</TableHead>
                            <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {campaigns.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Henüz ürün kampanyası oluşturulmadı.
                                </TableCell>
                            </TableRow>
                        )}
                        {campaigns.map((campaign) => {
                            const { targetText, benefitText } = parseRules(campaign.rules);
                            return (
                                <TableRow key={campaign.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{campaign.name}</span>
                                            <span className="text-xs text-muted-foreground">{campaign.description}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {campaign.type === "BOGO" ? <ShoppingBag className="w-3 h-3 mr-1" /> : <Percent className="w-3 h-3 mr-1" />}
                                            {campaign.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{targetText}</TableCell>
                                    <TableCell className="text-green-600 font-semibold">{benefitText}</TableCell>
                                    <TableCell>
                                        {campaign.storeIds.length === 0
                                            ? <Badge variant="secondary">Tüm Mağazalar</Badge>
                                            : <Badge variant="secondary">{campaign.storeIds.length} Mağaza</Badge>
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={campaign.isActive}
                                                onCheckedChange={() => handleToggle(campaign.id, campaign.isActive)}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {campaign.isActive ? "Aktif" : "Pasif"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(campaign.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
