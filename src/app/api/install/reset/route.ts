import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        // 1. Clear Cookie
        (await cookies()).delete("is_installed");

        // 2. Reset DB Status
        await db.systemConfig.upsert({
            where: { id: 1 },
            update: {
                isInstalled: false,
                licenseStatus: "TRIAL"
            },
            create: {
                id: 1,
                isInstalled: false
                // other fields default
            }
        });

        return NextResponse.json({ success: true, message: "Installation reset. Reload page." });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
// Reset handler
