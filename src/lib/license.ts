import { db } from "@/lib/db";

// This URL should be a raw JSON file hosted anywhere (GitHub Gist, Vercel, S3, etc.)
// Format: { "valid_keys": ["KEY-1", "KEY-2"], "suspended_keys": ["KEY-OLD"] }
const LICENSE_SERVER_URL = "https://raw.githubusercontent.com/furkan-erp/licenses/main/keys.json";

export async function verifyLicense() {
    try {
        const config = await db.systemConfig.findFirst();
        if (!config || !config.licenseKey) {
            return {
                status: "SUSPENDED",
                message: "Lisans anahtarı bulunamadı."
            };
        }

        // 1. Fetch Remote Status
        let remoteStatus = "ACTIVE";
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sec timeout

            const res = await fetch(LICENSE_SERVER_URL, {
                signal: controller.signal,
                cache: "no-store"
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const validKeys = data.valid_keys || [];
                const suspendedKeys = data.suspended_keys || [];

                if (suspendedKeys.includes(config.licenseKey)) {
                    remoteStatus = "SUSPENDED";
                } else if (validKeys.includes(config.licenseKey)) {
                    remoteStatus = "ACTIVE";
                } else {
                    // New/Unknown key logic: 
                    // Option A: Strict (Block if not in list) -> remoteStatus = "SUSPENDED"
                    // Option B: Permissive (Allow if not explicitly suspended) -> remoteStatus = "ACTIVE"
                    // We choose Option B for now to avoid accidental lockouts during dev.
                    remoteStatus = "ACTIVE";
                }
            }
        } catch (netError) {
            console.warn("License Server Unreachable, using cached status or ACTIVE.");
            // If offline, trust the current DB status or default to ACTIVE to prevent business interruption
            remoteStatus = config.licenseStatus || "ACTIVE";
        }

        // 2. Update Local DB if changed
        if (config.licenseStatus !== remoteStatus) {
            await db.systemConfig.update({
                where: { id: config.id },
                data: { licenseStatus: remoteStatus }
            });
        }

        return {
            status: remoteStatus,
            message: remoteStatus === "ACTIVE" ? "Lisans aktif." : "Lisans askıya alındı. Ödeme gerekli."
        };
    } catch (error) {
        console.error("License Verification System Error:", error);
        return { status: "ERROR", message: "Sistem hatası." };
    }
}
