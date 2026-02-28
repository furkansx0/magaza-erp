import fs from 'fs';
import path from 'path';

export interface ModuleConfig {
    id: string;
    name: string;
    route: string;
    iconName: string;
    isEnabled: boolean;
    requiredRole?: string | string[] | null;
    widgets?: {
        slot: string; // Hangi kancaya takılacağı (Örn: "sidebar-top")
        component: string; // Yüklenecek izole bileşen adı (Örn: "Widget")
        load?: () => Promise<any>; // Webpack Module not found hatasini onlemek icin dogrudan statik import fonksiyonu (Onerilen yontem)
    }[];
}

// Server-side function to discover modules dynamically
// It scans the src/modules directory and imports the config files automatically (Self-Register).
export async function getDynamicModules(): Promise<ModuleConfig[]> {
    try {
        const modulesPath = path.join(process.cwd(), 'src', 'modules');
        if (!fs.existsSync(modulesPath)) return [];

        const folders = fs.readdirSync(modulesPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

        const registry: ModuleConfig[] = [];
        for (const folder of folders) {
            try {
                // Import the config dynamically
                const mod = await import(`@/modules/${folder}/module-config`);
                if (mod && mod.config) {
                    registry.push(mod.config);
                }
            } catch (e) {
                // Ignore if module-config doesn't exist
            }
        }
        return registry;
    } catch (error) {
        console.error("Failed to read dynamic modules:", error);
        return [];
    }
}
