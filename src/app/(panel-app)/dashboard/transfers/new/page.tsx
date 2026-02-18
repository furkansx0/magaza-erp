import { db } from "@/lib/db";
import { TransferWizard } from "@/components/transfers/transfer-wizard";
import { getSession } from "@/lib/auth";

export default async function NewTransferPageWrapper() {
    const stores = await db.store.findMany();
    const session = await getSession();

    let staffId = session?.user?.id;

    // DEV FALLBACK: If no session, use the first user found (e.g. admin)
    if (!staffId) {
        const firstUser = await db.user.findFirst();
        staffId = firstUser?.id || "unknown";
    }

    return (
        <div className="p-8 space-y-6">
            <h2 className="text-2xl font-bold">Yeni Transfer Oluştur (Sihirbaz)</h2>
            <TransferWizard stores={stores} currentStaffId={staffId} />
        </div>
    )
}
