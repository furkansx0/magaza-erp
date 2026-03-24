export type PosProduct = {
    id: string;
    name: string;
    variantId: string;
    barcode: string;
    sku: string | null;
    price: number;
    stock: number;
    color: string | null;
    size: string | null;
    modelName: string;
    category: string | null;
    brand: string | null;
}

export type CartItem = {
    variantId: string;
    quantity: number;
    originalPrice: number;
    finalPrice: number;
    salesRepId?: string; // Added per-item sales rep
}

export type PaymentInput = {
    method: "CASH" | "CREDIT_CARD" | "GIFT_CARD" | "OTHER"; // Added OTHER just in case, but usually fixed array in pos-actions.
    amount: number;
    referenceCode?: string; // used for Gift Cards
}
