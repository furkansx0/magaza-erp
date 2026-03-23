import { NextResponse } from "next/server";
import { getFinanceStats, getSuppliers } from "@/actions/finance/finance-actions";

export async function GET() {
    try {
        const [stats, suppliers] = await Promise.all([
            getFinanceStats(),
            getSuppliers()
        ]);

        return NextResponse.json({ success: true, data: { stats, suppliers } });
    } catch (error) {
        console.error("API Finance Error:", error);
        return NextResponse.json({ success: false, error: "Finans verileri getirilemedi" }, { status: 500 });
    }
}
