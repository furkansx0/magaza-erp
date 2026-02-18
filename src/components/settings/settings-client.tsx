"use client"

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateSetting } from "@/actions/settings/settings-actions";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";

interface Setting {
    key: string;
    value: any;
    description: string | null;
    group: string;
}

export function SettingsClient({ initialSettings }: { initialSettings: Setting[] }) {
    // Group settings
    const groups = Array.from(new Set(initialSettings.map(s => s.group)));
    const groupedSettings = groups.reduce((acc, group) => {
        acc[group] = initialSettings.filter(s => s.group === group);
        return acc;
    }, {} as Record<string, Setting[]>);

    return (
        <Tabs defaultValue={groups[0] || "GENERAL"} className="w-full">
            <TabsList className="mb-4">
                {groups.map(group => (
                    <TabsTrigger key={group} value={group}>{group}</TabsTrigger>
                ))}
            </TabsList>

            {groups.map(group => (
                <TabsContent key={group} value={group} className="space-y-4">
                    {groupedSettings[group].map(setting => (
                        <div key={setting.key}>
                            {renderSettingForm(setting)}
                        </div>
                    ))}
                    {groupedSettings[group].length === 0 && (
                        <div className="text-center text-muted-foreground py-8">Bu grupta ayar bulunamadı.</div>
                    )}
                </TabsContent>
            ))}
        </Tabs>
    );
}

function renderSettingForm(setting: Setting) {
    if (setting.key === "inventory.transfer_rules") {
        return <InventoryRulesForm setting={setting} />;
    }
    if (setting.key === "product.attributes") {
        return <ProductAttributesForm setting={setting} />;
    }
    // Fallback to Generic JSON Editor
    return <GenericSettingForm setting={setting} />;
}

// --- SPECIALIZED FORMS ---

function InventoryRulesForm({ setting }: { setting: Setting }) {
    const [rules, setRules] = useState(setting.value);
    const [isSaving, setIsSaving] = useState(false);

    const strategies = [
        { val: "KEEP_SMALLEST", label: "En Küçük Bedeni Koru (Vitrinlik)" },
        { val: "KEEP_LARGEST", label: "En Büyük Bedeni Koru" },
        { val: "KEEP_EDGES", label: "Uçları Koru (En Küçük & En Büyük)" },
        { val: "KEEP_MOST_STOCKED", label: "En Çok Stoğu Olanı Koru" },
        { val: "DRAIN_ALL", label: "Hepsini Gönder (Mağazayı Boşalt)" },
    ];

    async function handleSave() {
        setIsSaving(true);
        const res = await updateSetting(setting.key, rules, setting.description || undefined, setting.group);
        if (res.success) toast.success("Transfer kuralları güncellendi");
        else toast.error(res.error);
        setIsSaving(false);
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle>Transfer & İkmal Mantığı</CardTitle>
                <CardDescription>{setting.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Transfer Eşiği (Min. Adet)</Label>
                        <Input
                            type="number"
                            value={rules.min_transfer_threshold}
                            onChange={(e) => setRules({ ...rules, min_transfer_threshold: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">En az kaç ürün birikirse transfer önerilsin?</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Agresiflik Faktörü (x Katı)</Label>
                        <Input
                            type="number"
                            value={rules.aggressive_factor}
                            onChange={(e) => setRules({ ...rules, aggressive_factor: parseInt(e.target.value) })}
                        />
                        <p className="text-xs text-muted-foreground">Hedef mağaza kaç kat hızlı satıyorsa stokları sömürsün?</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Stok Koruma Stratejisi</Label>
                    <Select
                        value={rules.retention_strategy}
                        onValueChange={(val) => setRules({ ...rules, retention_strategy: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {strategies.map(s => <SelectItem key={s.val} value={s.val}>{s.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Korunacak Adet (Retention Count)</Label>
                    <Input
                        type="number"
                        value={rules.retention_count}
                        onChange={(e) => setRules({ ...rules, retention_count: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">Seçilen kurala göre kaç adet/çeşit ürün mağazada bırakılsın?</p>
                </div>

                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Kaydediliyor..." : "Ayarları Kaydet"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

function ProductAttributesForm({ setting }: { setting: Setting }) {
    const [attributes, setAttributes] = useState<any[]>(Array.isArray(setting.value) ? setting.value : []);
    const [isSaving, setIsSaving] = useState(false);

    function addAttribute() {
        setAttributes([...attributes, { key: "", label: "", type: "text", options: [] }]);
    }

    function removeAttribute(index: number) {
        const newAttrs = [...attributes];
        newAttrs.splice(index, 1);
        setAttributes(newAttrs);
    }

    function updateAttribute(index: number, field: string, value: any) {
        const newAttrs = [...attributes];
        newAttrs[index] = { ...newAttrs[index], [field]: value };
        // If type changes to something else than select, clear options
        if (field === 'type' && value !== 'select') {
            delete newAttrs[index].options;
        }
        setAttributes(newAttrs);
    }

    async function handleSave() {
        // Validate keys
        if (attributes.some(a => !a.key || !a.label)) {
            toast.error("Lütfen tüm alanların (Key/Etiket) dolu olduğundan emin olun.");
            return;
        }

        setIsSaving(true);
        const res = await updateSetting(setting.key, attributes, setting.description || undefined, setting.group);
        if (res.success) toast.success("Ürün özellikleri güncellendi");
        else toast.error(res.error);
        setIsSaving(false);
    }

    return (
        <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Dinamik Ürün Alanları</CardTitle>
                    <CardDescription>{setting.description}</CardDescription>
                </div>
                <Button variant="secondary" size="sm" onClick={addAttribute}>
                    <Plus className="h-4 w-4 mr-2" /> Yeni Alan Ekle
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {attributes.map((attr, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/50">
                        <div className="col-span-3">
                            <Label className="text-xs">Sistem Adı (Key)</Label>
                            <Input
                                value={attr.key}
                                placeholder="fabric_type"
                                onChange={(e) => updateAttribute(index, 'key', e.target.value)}
                            />
                        </div>
                        <div className="col-span-3">
                            <Label className="text-xs">Görünecek İsim</Label>
                            <Input
                                value={attr.label}
                                placeholder="Kumaş Tipi"
                                onChange={(e) => updateAttribute(index, 'label', e.target.value)}
                            />
                        </div>
                        <div className="col-span-3">
                            <Label className="text-xs">Veri Tipi</Label>
                            <Select
                                value={attr.type}
                                onValueChange={(val) => updateAttribute(index, 'type', val)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Metin</SelectItem>
                                    <SelectItem value="number">Sayı</SelectItem>
                                    <SelectItem value="select">Seçmeli Liste</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2">
                            {attr.type === 'select' && (
                                <>
                                    <Label className="text-xs">Seçenekler</Label>
                                    <Input
                                        placeholder="Virgülle ayırın"
                                        value={Array.isArray(attr.options) ? attr.options.join(", ") : ""}
                                        onChange={(e) => updateAttribute(index, 'options', e.target.value.split(",").map(s => s.trim()))}
                                    />
                                </>
                            )}
                        </div>

                        <div className="col-span-1 flex justify-end">
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeAttribute(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {attributes.length === 0 && <div className="text-center text-sm text-muted-foreground">Henüz eklenmiş bir özellik yok.</div>}

                <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function GenericSettingForm({ setting }: { setting: Setting }) {
    const [value, setValue] = useState(JSON.stringify(setting.value, null, 2));
    const [isSaving, setIsSaving] = useState(false);

    async function handleSave() {
        setIsSaving(true);
        try {
            let parsedValue;
            try {
                parsedValue = JSON.parse(value);
            } catch (e) {
                toast.error("Geçersiz JSON formatı!");
                setIsSaving(false);
                return;
            }

            const res = await updateSetting(setting.key, parsedValue, setting.description || undefined, setting.group);
            if (res.success) {
                toast.success("Ayar güncellendi");
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Bir hata oluştu");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="font-mono text-lg">{setting.key}</CardTitle>
                <CardDescription>{setting.description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-2">
                    <Label>Değer (JSON)</Label>
                    <Textarea
                        className="font-mono text-sm bg-zinc-950 text-green-400 min-h-[150px]"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Kaydediliyor..." : "Kaydet"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
