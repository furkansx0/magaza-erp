import { Suspense } from "react";
import { getSettings, initDefaultSettings } from "@/actions/settings/settings-actions";
import { SettingsClient } from "@/components/settings/settings-client";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
    const { settings } = await getSettings();

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-900 p-6 rounded-lg border">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sistem Ayarları</h1>
                    <p className="text-muted-foreground mt-2">
                        Uygulamanın davranışını değiştiren kritik konfigürasyonlar.
                        <br />
                        <span className="text-xs text-amber-600 font-medium">Dikkat: Buradaki değişiklikler tüm sistemi etkiler.</span>
                    </p>
                </div>
                <form action={async () => { "use server"; await initDefaultSettings(); }}>
                    <Button variant="outline" type="submit"> Varsayılanları Yükle</Button>
                </form>
            </div>

            <Suspense fallback={<div>Yükleniyor...</div>}>
                <SettingsClient initialSettings={settings || []} />
            </Suspense>
        </div>
    );
}
