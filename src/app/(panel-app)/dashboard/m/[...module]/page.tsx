import { notFound } from "next/navigation";
import React from "react";

interface ModulePageProps {
    params: Promise<{
        module: string[];
    }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DynamicModulePage(props: ModulePageProps) {
    const params = await props.params;
    const searchParams = await props.searchParams;

    // The module param is an array. E.g., /dashboard/m/test-module -> module: ["test-module"]
    // /dashboard/m/test-module/edit/1 -> module: ["test-module", "edit", "1"]
    const modulePathName = params.module[0]; // "test-module"
    const subRoute = params.module.slice(1).join("/"); // "edit/1" or ""

    try {
        // Dynamically import the page component from the module's dir
        // We try to load the main page or sub pages based on the URL.
        const importPath = subRoute ? `@/modules/${modulePathName}/pages/${subRoute}` : `@/modules/${modulePathName}/page`;

        let ModuleComponent;
        try {
            // Webpack Needs a specific prefix logic for dynamic imports
            ModuleComponent = (await import(`@/modules/${modulePathName}/page`)).default;

            // If subRoute exists, we might need a different component, but for Zero-Config v1, 
            // standardizing on a single entry page which handles its own routing, 
            // or we expect NextJS to map exactly. 
            // Here, we'll try to load the exact subpath or default to the module's main page.
            if (subRoute) {
                try {
                    ModuleComponent = (await import(`@/modules/${modulePathName}/pages/${subRoute}`)).default;
                } catch (e) {
                    // Fallback to the main page if the subpage is not found - let the module handle internal routing if needed
                    ModuleComponent = (await import(`@/modules/${modulePathName}/page`)).default;
                }
            }

        } catch (innerError) {
            console.error(`Dynamic import failed for module: ${modulePathName}`, innerError);
            return notFound();
        }

        return <ModuleComponent params={params} searchParams={searchParams} />;

    } catch (error) {
        console.error("Module page crash:", error);
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                <h1 className="text-2xl font-bold text-red-600 mb-2">Modül Yükleme Hatası</h1>
                <p className="text-gray-600">Bu modülün arayüzü başlatılamadı veya sistemde eksik.</p>
                <div className="mt-4 text-xs text-gray-400 bg-gray-100 p-2 border rounded">
                    {String(error)}
                </div>
            </div>
        );
    }
}
