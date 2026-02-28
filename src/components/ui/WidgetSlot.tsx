import React from "react";
import { getDynamicModules } from "@/lib/registry";

interface WidgetSlotProps {
    name: string;
    // Widget components might need some context. E.g user context, or storeId.
    // For now we'll pass whatever additional props are given.
    [key: string]: any;
}

export default async function WidgetSlot({ name, ...props }: WidgetSlotProps) {
    // 1. Fetch available modules
    const modules = await getDynamicModules();
    const activeModules = modules.filter(m => m.isEnabled);

    // 2. Find widgets that registered for this specific slot name
    const matchingWidgets = activeModules.flatMap(mod => {
        if (!mod.widgets) return [];
        return mod.widgets
            .filter(w => w.slot === name)
            .map(w => ({
                moduleId: mod.id,
                componentName: w.component,
                load: w.load
            }));
    });

    if (matchingWidgets.length === 0) return null;

    // 3. Dynamically import each widget component based on the module folder
    const renderedWidgets = await Promise.all(
        matchingWidgets.map(async (widgetDef, index) => {
            try {
                // Webpack Module not found hatasini onlemek icin:
                // Moduller artik Widget'larini kendileri `module-config.ts` uzerinden 
                // `load: () => import('./Widget')` seklinde tanimlayacaklar.
                let WidgetComponent: any = null;

                if (widgetDef.load) {
                    const mod = await widgetDef.load();
                    WidgetComponent = mod.default || mod;
                } else {
                    // Eger load fonksiyonu yoksa (eski yapi) fallback olarak hala dinamik cekmeyi deneyebilir.
                    // Fakat Next.js bunu statik analiz edince hata firlatir. O yuzden load fonksiyonu zorunlu kilinmalidir.
                    console.warn(`[WidgetSlot] '${widgetDef.moduleId}' modulu 'load' fonksiyonu tanimlamadigi icin widget yuklenemedi.`);
                    return null;
                }

                if (!WidgetComponent) return null;

                // React requires a key for arrays of components
                return <WidgetComponent key={`${widgetDef.moduleId}-${index}`} {...props} />;
            } catch (error) {
                console.error(`Widget enjeksiyonu hatasi (Module: ${widgetDef.moduleId}, Component: ${widgetDef.componentName}):`, error);
                return (
                    <div key={`error-${index}`} className="text-xs text-red-500 bg-red-50 p-1 rounded border border-red-200">
                        Widget Yüklenemedi [{widgetDef.moduleId}]
                    </div>
                );
            }
        })
    );

    return (
        <React.Fragment>
            {renderedWidgets}
        </React.Fragment>
    );
}
