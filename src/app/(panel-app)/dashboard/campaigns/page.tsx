import { prisma } from "@/lib/db"
import { getCampaigns } from "@/actions/crm/campaign-actions"
import { getProductCampaigns } from "@/actions/crm/campaign-product-actions"

// Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NewCampaignDialog } from "@/components/campaigns/new-campaign-dialog"
import { ProductCampaignsList } from "@/components/campaigns/product-campaigns-list"
import { NewProductCampaignDialog } from "@/components/campaigns/new-product-campaign-dialog"
import { GiftCampaignsContent } from "@/components/campaigns/gift-campaigns-content"

export default async function CampaignsPage() {
    const giftCampaigns = await getCampaigns();
    const productCampaigns = await getProductCampaigns();

    // Fetch unique categories and brands for the filter dropdowns
    const categories = await prisma.productModel.findMany({
        where: { isArchived: false },
        select: { category: true },
        distinct: ['category']
    });
    const brands = await prisma.productModel.findMany({
        where: { isArchived: false },
        select: { brand: true },
        distinct: ['brand']
    });

    const uniqueCategories = categories.map(c => c.category).filter(Boolean) as string[];
    const uniqueBrands = brands.map(b => b.brand).filter(Boolean) as string[];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Kampanyalar & Otomasyon</h2>
            </div>

            <Tabs defaultValue="product" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="product">Ürün Kampanyaları (BOGO / İndirim)</TabsTrigger>
                    <TabsTrigger value="gift">Hediye Çeki Kampanyaları (Özel Gün)</TabsTrigger>
                </TabsList>

                <TabsContent value="product" className="space-y-4">
                    <div className="flex justify-end">
                        <NewProductCampaignDialog
                            uniqueCategories={uniqueCategories}
                            uniqueBrands={uniqueBrands}
                        />
                    </div>
                    <ProductCampaignsList campaigns={productCampaigns} />
                </TabsContent>

                <TabsContent value="gift" className="space-y-4">
                    <div className="flex justify-end">
                        <NewCampaignDialog />
                    </div>
                    <GiftCampaignsContent campaigns={giftCampaigns} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
