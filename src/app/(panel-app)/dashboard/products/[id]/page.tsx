import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ProductDashboardClient } from "@/components/products/product-dashboard-client";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
    const { id } = await params;

    const model = await db.productModel.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            brand: true,
            category: true,
            modelCode: true,
            seasonYear: true,
            seasonType: true
        }
    });

    if (!model) return notFound();

    return <ProductDashboardClient modelId={id} modelName={model.name} />;
}
