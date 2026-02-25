import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
    // Authentication Check
    // 1. Session based (for manual browser downloads)
    const session = await getSession();

    // 2. Token based (for automated cron jobs)
    // You can set BACKUP_CRON_TOKEN in .env for automated secure access
    const authHeader = req.headers.get("authorization");
    const cronToken = process.env.BACKUP_CRON_TOKEN || "super-secret-backup-token";
    const isCronAuthorized = authHeader === `Bearer ${cronToken}`;

    const isAdmin = session?.role === "ADMIN";

    if (!isAdmin && !isCronAuthorized) {
        return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        return NextResponse.json({ error: "DATABASE_URL is not defined in environment variables" }, { status: 500 });
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `backup-${timestamp}.sql`;

        // Use os.tmpdir() for cross-platform and serverless compatibility (though pg_dump requires system install)
        const os = require("os");
        const filepath = path.join(os.tmpdir(), filename);

        // Run pg_dump
        // Requires pg_dump to be installed on the system where this Node app is running
        const command = `pg_dump "${databaseUrl}" -F p -f "${filepath}"`;

        await execAsync(command);

        // Read the generated file
        const fileBuffer = fs.readFileSync(filepath);

        // Optional: Clean up the file after reading
        fs.unlinkSync(filepath);

        // Return as downloadable file
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Type": "application/sql",
                "Cache-Control": "no-store, max-age=0",
            },
        });

    } catch (error: any) {
        console.error("Backup failed:", error);
        return NextResponse.json({
            error: "Backup failed. Make sure pg_dump is installed on the server.",
            details: error.message
        }, { status: 500 });
    }
}
