// src/lib/taxonomy.ts

export type TaxonomyNode = {
    label: string;
    value: string;
    children?: TaxonomyNode[];
    features?: string[]; // E.g., "material", "style" valid for this category
};

export const PRODUCT_TAXONOMY: TaxonomyNode[] = [
    {
        label: "Ayakkabı",
        value: "Ayakkabı",
        children: [
            { label: "Spor Ayakkabı", value: "Spor Ayakkabı" },
            { label: "Casual Ayakkabı", value: "Casual" },
            { label: "Bot", value: "Bot" },
            { label: "Çizme", value: "Çizme" },
            { label: "Klasik Ayakkabı", value: "Klasik" },
            { label: "Terlik & Sandalet", value: "Terlik" },
            { label: "Sneaker", value: "Sneaker" },
            { label: "Outdoor / Maraton", value: "Outdoor" }
        ]
    },
    {
        label: "Giyim",
        value: "Giyim",
        children: [
            { label: "T-Shirt", value: "T-Shirt" },
            { label: "Pantolon", value: "Pantolon" },
            { label: "Mont & Kaban", value: "Mont" },
            { label: "Gömlek", value: "Gömlek" },
            { label: "Sweatshirt", value: "Sweatshirt" },
            { label: "Eşofman", value: "Eşofman" },
            { label: "Çorap", value: "Çorap" }
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
