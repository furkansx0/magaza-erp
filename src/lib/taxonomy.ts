// src/lib/taxonomy.ts

export type TaxonomyNode = {
    label: string;
    value: string;
    children?: TaxonomyNode[];
    features?: string[]; // E.g., "material", "style" valid for this category
};

export const PRODUCT_TAXONOMY: TaxonomyNode[] = [
    {
        label: "Erkek",
        value: "Erkek",
        children: [
            {
                label: "Ayakkabı",
                value: "Ayakkabı",
                children: [
                    { label: "Klasik", value: "Klasik" },
                    { label: "Spor", value: "Spor" },
                    { label: "Bot", value: "Bot" },
                    { label: "Günlük", value: "Günlük" },
                    { label: "Terlik/Sandalet", value: "Terlik" }
                ]
            },
            {
                label: "Giyim",
                value: "Giyim",
                children: [
                    { label: "T-Shirt", value: "T-Shirt" },
                    { label: "Pantolon", value: "Pantolon" },
                    { label: "Mont/Kaban", value: "Mont" }
                ]
            }
        ]
    },
    {
        label: "Kadın",
        value: "Kadın",
        children: [
            {
                label: "Ayakkabı",
                value: "Ayakkabı",
                children: [
                    { label: "Topuklu", value: "Topuklu" },
                    { label: "Bot/Çizme", value: "Bot" },
                    { label: "Spor", value: "Spor" },
                    { label: "Sandalet", value: "Sandalet" }
                ]
            }
            // ... more categories
        ]
    },
    {
        label: "Çocuk",
        value: "Çocuk",
        children: [
            {
                label: "Ayakkabı",
                value: "Ayakkabı",
                children: [
                    { label: "Spor", value: "Spor" },
                    { label: "Bot", value: "Bot" },
                    { label: "Okul", value: "Okul" }
                ]
            }
        ]
    }
];

export const BRANDS = [
    "Nike", "Adidas", "Puma", "Skechers", "Mavi", "Zara", "LCW", "Kinetix", "Polaris", "Lumberjack", "Hammer Jack", "Diğer"
];

export const SEASONS = [
    "2024 Yaz", "2024 Kış", "2025 Yaz", "2025 Kış", "4 Mevsim", "Outlet"
];

export const MATERIALS = [
    "Deri", "Süet", "Nubuk", "Tekstil", "Sentetik", "Rugan"
];

export const STYLES = [
    "Bağcıklı", "Fermuarlı", "Cırtlı", "Slip-on", "Tokalı"
];
