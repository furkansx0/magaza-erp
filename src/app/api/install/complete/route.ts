import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { branding } = body;

        // 1. Update System Config
        // We use upsert to ensure we update the singleton record (id: 1)
        await db.systemConfig.upsert({
            where: { id: 1 },
            update: {
                isInstalled: true,
                companyName: branding.companyName,
                appTitle: branding.appTitle,
                licenseKey: branding.licenseKey,
                licenseStatus: "ACTIVE"
            },
            create: {
                id: 1,
                isInstalled: true,
                companyName: branding.companyName,
                appTitle: branding.appTitle,
                licenseKey: branding.licenseKey,
                licenseStatus: "ACTIVE"
            }
        });

        // 2. Set Cookie (Essential for Middleware)
        (await cookies()).set("is_installed", "true", {
            maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
            httpOnly: false, // Allow client access if needed
            path: "/"
        });

        // 3. Return Success
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Installation Error:", error);
        return NextResponse.json({ success: false, error: "Kurulum hatası" }, { status: 500 });
    }
}
// Install complete handler
