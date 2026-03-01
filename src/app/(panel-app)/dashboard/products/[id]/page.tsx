import { db } from "@/lib/db";
import { EditProductClient } from "./edit-client";
import { notFound } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
    const { id } = await params; // Await params in Next.js 15+

    const product = await db.productModel.findUnique({
        where: { id },
        include: {
            variants: {
                where: { isArchived: false },
                include: { stocks: true }
            }
        }
    });

    if (!product) return notFound();

    const stores = await db.store.findMany({
        select: { id: true, name: true }
    });

    // Serialize Decimals
    const serializedProduct = {
        ...product,
        variants: product.variants.map(v => ({
            ...v,
            purchasePrice: Number(v.purchasePrice),
            salePrice: Number(v.salePrice),
            secondPrice: v.secondPrice ? Number(v.secondPrice) : null
        }))
    };

    return <EditProductClient product={serializedProduct as any} stores={stores} />;
}
