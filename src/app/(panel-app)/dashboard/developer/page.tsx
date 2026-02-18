"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, Trash2, Database, Users, ShoppingCart, Gift } from "lucide-react"
import { seedProductsBatch, seedSales, seedGiftCards, seedCustomers } from "@/actions/settings/seed-actions"
import { deleteAllProducts, deleteAllCustomers, deleteAllSales, deleteAllGiftCards } from "@/actions/settings/reset-actions"
import { getStores } from "@/actions/settings/store-actions"

export default function DeveloperPage() {
    const [loading, setLoading] = useState<string | null>(null);

    const handleAction = async (actionName: string, actionFn: () => Promise<any>, confirmMsg: string) => {
        if (!confirm(confirmMsg)) return;
        setLoading(actionName);
        try {
            const res = await actionFn();
            if (res.success) {
                toast.success(res.message || "İşlem başarılı");
            } else {
                toast.error("Hata: " + res.error);
            }
        } catch (e: any) {
            toast.error("Beklenmedik hata: " + e.message);
        } finally {
            setLoading(null);
        }
    }

    const handleSeedProducts = async () => {
        if (!confirm("5000 adet test ürünü oluşturulacak. Bu işlem biraz sürebilir. Onaylıyor musunuz?")) return;
        setLoading("products_seed");
        try {
            // Need store IDs for products
            const storesRes = await getStores();
            if (!storesRes.success || !storesRes.stores || storesRes.stores.length === 0) {
                toast.error("Önce en az bir mağaza oluşturmalısınız.");
                setLoading(null);
                return;
            }
            const storeIds = storesRes.stores.map(s => s.id);

            // Batch process
            const total = 5000;
            const batch = 50;
            const batches = total / batch;

            for (let i = 0; i < batches; i++) {
                const res = await seedProductsBatch(batch, storeIds);
                if (!res.success) {
                    toast.error(res.error);
                    break;
                }
            }
            toast.success("5000 Ürün oluşturuldu.");
        } catch (e) { toast.error("Hata oluştu"); }
        finally { setLoading(null); }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Geliştirici Paneli</h2>
                <p className="text-muted-foreground">Test verileri üretme ve veritabanı temizleme araçları.</p>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
                {/* SEED DATA */}
                <Card className="border-green-100 bg-green-50/20">
                    <CardHeader>
                        <CardTitle className="flex items-center text-green-700">
                            <Database className="mr-2 h-5 w-5" />
                            Test Verisi Üret
                        </CardTitle>
                        <CardDescription>
                            Sistemi test etmek için rastgele veriler oluşturun.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            className="w-full justify-start bg-green-600 hover:bg-green-700"
                            disabled={!!loading}
                            onClick={() => handleAction("customer_seed", () => seedCustomers(100), "100 adet test müşterisi oluşturulacak?")}
                        >
                            {loading === "customer_seed" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Users className="mr-2 h-4 w-4" />
                            Test Müşterisi Ata (100)
                        </Button>

                        <Button
                            className="w-full justify-start bg-green-600 hover:bg-green-700"
                            disabled={!!loading}
                            onClick={handleSeedProducts}
                        >
                            {loading === "products_seed" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Database className="mr-2 h-4 w-4" />
                            Test Ürünü Ata (5000)
                        </Button>

                        <Button
                            className="w-full justify-start bg-green-600 hover:bg-green-700"
                            disabled={!!loading}
                            onClick={() => handleAction("sales_seed", () => seedSales(500, "mixed"), "500 adet karışık satış (Personel, Tarih, Mağaza) oluşturulacak?")}
                        >
                            {loading === "sales_seed" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Test Satışı Ata (Karışık - 500)
                        </Button>

                        <Button
                            className="w-full justify-start bg-green-600 hover:bg-green-700"
                            disabled={!!loading}
                            onClick={() => handleAction("gift_seed", () => seedGiftCards(50), "50 adet rastgele hediye çeki oluşturulacak?")}
                        >
                            {loading === "gift_seed" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Gift className="mr-2 h-4 w-4" />
                            Test Hediye Çeki Dağıt
                        </Button>
                    </CardContent>
                </Card>

                {/* DELETE DATA */}
                <Card className="border-red-100 bg-red-50/20">
                    <CardHeader>
                        <CardTitle className="flex items-center text-red-700">
                            <Trash2 className="mr-2 h-5 w-5" />
                            Verileri Temizle (Danger Zone)
                        </CardTitle>
                        <CardDescription>
                            Dikkat! Bu işlemler geri alınamaz.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            variant="destructive"
                            className="w-full justify-start"
                            disabled={!!loading}
                            onClick={() => handleAction("del_customers", deleteAllCustomers, "DİKKAT: Tüm Müşteriler SILINECEK. Onaylıyor musunuz?")}
                        >
                            {loading === "del_customers" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Users className="mr-2 h-4 w-4" />
                            Tüm Müşterileri Sil
                        </Button>

                        <Button
                            variant="destructive"
                            className="w-full justify-start"
                            disabled={!!loading}
                            onClick={() => handleAction("del_products", deleteAllProducts, "DİKKAT: Tüm Ürünler ve Stoklar SILINECEK. Onaylıyor musunuz?")}
                        >
                            {loading === "del_products" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Database className="mr-2 h-4 w-4" />
                            Tüm Ürünleri Sil
                        </Button>

                        <Button
                            variant="destructive"
                            className="w-full justify-start"
                            disabled={!!loading}
                            onClick={() => handleAction("del_sales", deleteAllSales, "DİKKAT: Tüm Satış Geçmişi SILINECEK. Onaylıyor musunuz?")}
                        >
                            {loading === "del_sales" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Tüm Satışları Sil
                        </Button>

                        <Button
                            variant="destructive"
                            className="w-full justify-start"
                            disabled={!!loading}
                            onClick={() => handleAction("del_cards", deleteAllGiftCards, "DİKKAT: Tüm Hediye Çekleri SILINECEK. Onaylıyor musunuz?")}
                        >
                            {loading === "del_cards" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Gift className="mr-2 h-4 w-4" />
                            Tüm Hediye Çeklerini Sil
                        </Button>

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
