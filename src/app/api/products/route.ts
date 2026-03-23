import { NextRequest, NextResponse } from "next/server";
import { getProductsWithFilters } from "@/actions/inventory/product-query-actions";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        
        const params = {
            page: parseInt(searchParams.get("page") || "1"),
            limit: parseInt(searchParams.get("limit") || "100"),
            search: searchParams.get("search") || undefined,
            brand: searchParams.getAll("brand"),
            category: searchParams.getAll("category"),
            season: searchParams.getAll("season"),
            material: searchParams.getAll("material"),
            showArchived: searchParams.get("status") === "archived"
        };

        const result = await getProductsWithFilters(params);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("API Products Error:", error);
        return NextResponse.json({ error: "İç sunucu hatası" }, { status: 500 });
    }
}
