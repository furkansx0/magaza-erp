"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { initDefaultSettings, updateSetting } from "@/actions/settings/settings-actions";
import { createAdminUser } from "@/actions/settings/user-actions"; // Helper function created
import { ShieldCheck, Layers, Type, UserCircle, ArrowRight, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Branding
    const [branding, setBranding] = useState({
        companyName: "",
        appTitle: "Retail ERP",
        licenseKey: ""
    });

    // Step 2: Modules
    const [modules, setModules] = useState({
        crm: true,
        inventory: true,
        pos: true,
        finance: true,
        expenses: false,
        gift_cards: false
    });

    // Step 3: Naming
    const [labels, setLabels] = useState({
        products: "Ürünler",
        customers: "Müşteriler",
        stores: "Mağazalar"
    });

    // Step 4: Admin
    const [admin, setAdmin] = useState({
        fullName: "Sistem Yöneticisi",
        username: "admin",
        password: "",
        confirmPassword: ""
    });

    // Validation Status
    const [canNext, setCanNext] = useState(false);

    useEffect(() => {
        validateStep();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step, branding, modules, labels, admin]);

    function validateStep() {
        let valid = false;
        if (step === 1) {
            valid = branding.companyName.length > 2 && branding.appTitle.length > 2 && branding.licenseKey.length > 5;
        } else if (step === 2) {
            // At least one core module
            valid = modules.inventory || modules.pos || modules.finance;
        } else if (step === 3) {
            valid = labels.products.length > 0 && labels.customers.length > 0 && labels.stores.length > 0;
        } else if (step === 4) {
            valid = admin.fullName.length > 2 && admin.username.length > 3 && admin.password.length > 3 && admin.password === admin.confirmPassword;
        }
        setCanNext(valid);
    }

    async function nextStep() {
        if (canNext) setStep(step + 1);
    }

    async function finishInstallation() {
        if (!canNext) return;
        setLoading(true);
        try {
            // 1. Initialize Settings
            await initDefaultSettings();

            // 2. Save Module Config
            await updateSetting("modules", modules, "Aktif Modüller", "SYSTEM");

            // 3. Save Labels
            await updateSetting("menu_labels", labels, "Menü İsimlendirmeleri", "SYSTEM");

            // 4. Create Admin (Corrected Call)
            const userRes = await createAdminUser({
                name: admin.fullName,
                username: admin.username,
                password: admin.password
            });

            if (!userRes.success) throw new Error(userRes.error);

            // 5. Finalize & License Check
            const res = await fetch("/api/install/complete", {
                method: "POST",
                body: JSON.stringify({ branding })
            });

            if (res.ok) {
                toast.success("Kurulum başarıyla tamamlandı! Yönlendiriliyorsunuz...");
                setTimeout(() => {
                    router.push("/dashboard");
                    router.refresh();
                }, 2000);
            } else {
                throw new Error("Kurulum tamamlanamadı.");
            }

        } catch (error: any) {
            toast.error(error.message || "Bir hata oluştu");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 font-sans">
            <Card className="w-full max-w-3xl shadow-2xl border-0 overflow-hidden ring-1 ring-zinc-200 dark:ring-zinc-800">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner">
                            {step}
                        </div>
                        <div>
                            <h1 className="font-bold text-2xl tracking-tight">SaaS Kurulum Sihirbazı</h1>
                            <p className="text-blue-100 text-sm">Adım {step}/4: {
                                step === 1 ? "Şirket & Lisans" :
                                    step === 2 ? "Modül Yapılandırması" :
                                        step === 3 ? "Arayüz Kişiselleştirme" : "Yönetici Hesabı"
                            }</p>
                        </div>
                    </div>
                </div>

                <CardContent className="p-8 min-h-[400px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-4 border border-blue-100 dark:border-blue-900">
                                        <ShieldCheck className="w-6 h-6 text-blue-600 mt-1" />
                                        <div>
                                            <h3 className="font-semibold text-blue-900 dark:text-blue-100">Hoşgeldiniz</h3>
                                            <p className="text-sm text-blue-700 dark:text-blue-300">Bu sihirbaz, ERP sisteminizi şirketinizin ihtiyaçlarına göre yapılandırmanıza yardımcı olacaktır.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Şirket Adı <span className="text-red-500">*</span></Label>
                                            <Input value={branding.companyName} onChange={e => setBranding({ ...branding, companyName: e.target.value })} placeholder="Örn: ACME Giyim A.Ş." className="h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Uygulama Başlığı</Label>
                                            <Input value={branding.appTitle} onChange={e => setBranding({ ...branding, appTitle: e.target.value })} placeholder="Örn: Mağaza Stok Sistemi" className="h-11" />
                                        </div>
                                        <div className="col-span-2 space-y-2">
                                            <Label>Lisans Anahtarı <span className="text-red-500">*</span></Label>
                                            <Input value={branding.licenseKey} onChange={e => setBranding({ ...branding, licenseKey: e.target.value })} placeholder="XXXX-XXXX-XXXX-XXXX" className="h-11 font-mono tracking-widest" />
                                            {branding.licenseKey.length > 0 && branding.licenseKey.length < 5 && (
                                                <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Geçersiz lisans anahtarı</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-500" /> Modül Seçimi</h3>
                                            <p className="text-sm text-muted-foreground">Kullanılmayacak modülleri kapatarak arayüzü sadeleştirebilirsiniz.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(modules).map(([key, val]) => (
                                            <div
                                                key={key}
                                                className={`flex items-center space-x-3 border p-4 rounded-xl transition-all cursor-pointer select-none ${val ? 'border-green-500 bg-green-50/50 dark:bg-green-900/20 ring-1 ring-green-500' : 'opacity-70 grayscale hover:grayscale-0'}`}
                                                onClick={() => setModules({ ...modules, [key]: !val })}
                                            >
                                                <Checkbox
                                                    id={key}
                                                    checked={val}
                                                    onCheckedChange={(c) => setModules({ ...modules, [key]: c as boolean })}
                                                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                                />
                                                <div className="flex-1">
                                                    <Label htmlFor={key} className="capitalize text-base font-medium cursor-pointer">
                                                        {key.replace("_", " ")}
                                                    </Label>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {key === 'crm' ? 'Müşteri takibi ve sadakat programı' :
                                                            key === 'pos' ? 'Hızlı satış ekranı ve kasa işlemleri' :
                                                                key === 'inventory' ? 'Stok, varyant ve depo yönetimi' :
                                                                    'Finansal raporlar ve gider takibi'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                            <Type className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Terminoloji Özelleştirme</h3>
                                            <p className="text-sm text-muted-foreground">Sektörünüze uygun isimleri belirleyin (Örn: Ürünler yerine "Yemekler").</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                        <div className="space-y-2">
                                            <Label className="text-xs uppercase text-muted-foreground">Orijinal İsim</Label>
                                            <div className="p-3 bg-white dark:bg-zinc-900 border rounded-md text-sm text-muted-foreground">Products</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-green-600 font-medium">Görünecek İsim</Label>
                                            <Input value={labels.products} onChange={e => setLabels({ ...labels, products: e.target.value })} className="border-green-200 focus-visible:ring-green-500" />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="p-3 bg-white dark:bg-zinc-900 border rounded-md text-sm text-muted-foreground">Customers</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Input value={labels.customers} onChange={e => setLabels({ ...labels, customers: e.target.value })} className="border-green-200 focus-visible:ring-green-500" />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="p-3 bg-white dark:bg-zinc-900 border rounded-md text-sm text-muted-foreground">Stores</div>
                                        </div>
                                        <div className="space-y-2">
                                            <Input value={labels.stores} onChange={e => setLabels({ ...labels, stores: e.target.value })} className="border-green-200 focus-visible:ring-green-500" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <UserCircle className="w-6 h-6 text-purple-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">Süper Yönetici Hesabı</h3>
                                            <p className="text-sm text-muted-foreground">Tüm sisteme tam erişimi olan ana hesap.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 max-w-md mx-auto">
                                        <div className="space-y-2">
                                            <Label>Ad Soyad</Label>
                                            <Input value={admin.fullName} onChange={e => setAdmin({ ...admin, fullName: e.target.value })} placeholder="Örn: Ahmet Yılmaz" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Kullanıcı Adı</Label>
                                            <Input value={admin.username} onChange={e => setAdmin({ ...admin, username: e.target.value })} placeholder="admin" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Şifre</Label>
                                            <Input type="password" value={admin.password} onChange={e => setAdmin({ ...admin, password: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Şifre Tekrar</Label>
                                            <Input type="password" value={admin.confirmPassword} onChange={e => setAdmin({ ...admin, confirmPassword: e.target.value })} />
                                            {admin.password !== admin.confirmPassword && admin.confirmPassword.length > 0 && (
                                                <p className="text-xs text-red-500">Şifreler eşleşmiyor</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>

                <CardFooter className="bg-zinc-50 dark:bg-zinc-900/50 p-6 flex justify-between border-t">
                    <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1 || loading} className="w-32">
                        Geri
                    </Button>

                    {step < 4 ? (
                        <Button onClick={nextStep} disabled={!canNext} className="w-32 bg-indigo-600 hover:bg-indigo-700">
                            İleri <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={finishInstallation} disabled={loading || !canNext} className="w-48 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20">
                            {loading ? "Kuruluyor..." : (
                                <>
                                    <Check className="w-4 h-4 mr-2" /> Kurulumu Bitir
                                </>
                            )}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
