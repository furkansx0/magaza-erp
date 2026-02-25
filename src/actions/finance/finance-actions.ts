"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { createAuditLog } from "@/actions/settings/audit-actions"

// --- TYPES ---
export interface FinanceStats {
    totalDebt: number
    overdueDebt: number
    upcomingDebt: number
    topDebtor: { name: string, balance: number } | null
}

export interface SupplierWithBalance {
    id: string
    name: string
    phone: string | null
    address: string | null
    balance: number
    overdue: number
    upcoming: number
}

// --- ACTIONS ---

export async function getFinanceStats(): Promise<FinanceStats> {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);

    // Only fetch UNPAID transactions
    const suppliers = await db.supplier.findMany({
        include: {
            transactions: {
                where: { isPaid: false }
            }
        }
    });

    let totalDebt = 0;
    let overdueDebt = 0;
    let upcomingDebt = 0;
    let maxDebt = 0;
    let topDebtorName = "";

    for (const s of suppliers) {
        let balance = 0;
        let sOverdue = 0;
        let sUpcoming = 0;

        for (const t of s.transactions) {
            const amount = Number(t.amount);

            // In new logic, all relevant transactions are Unpaid Debts (isPaid=false)
            balance += amount;

            if (t.dueDate) {
                const due = new Date(t.dueDate);
                if (due < today) {
                    sOverdue += amount;
                } else if (due <= nextMonth) {
                    sUpcoming += amount;
                }
            }
        }

        totalDebt += balance;
        overdueDebt += sOverdue;
        upcomingDebt += sUpcoming;

        if (balance > maxDebt) {
            maxDebt = balance;
            topDebtorName = s.name;
        }
    }

    return {
        totalDebt,
        overdueDebt,
        upcomingDebt,
        topDebtor: maxDebt > 0 ? { name: topDebtorName, balance: maxDebt } : null
    }
}

export async function getSuppliers(query: string = ""): Promise<SupplierWithBalance[]> {
    const suppliers = await db.supplier.findMany({
        where: {
            name: { contains: query }
        },
        include: {
            transactions: {
                where: { isPaid: false }
            }
        },
        orderBy: { name: 'asc' }
    });

    const result: SupplierWithBalance[] = suppliers.map(s => {
        let balance = 0;
        let overdueRaw = 0;
        let upcomingRaw = 0;
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);

        s.transactions.forEach(t => {
            const val = Number(t.amount);
            balance += val;

            if (t.dueDate) {
                const d = new Date(t.dueDate);
                if (d < today) overdueRaw += val;
                else if (d <= nextMonth) upcomingRaw += val;
            }
        });

        // Smart Capping logic
        let safeOverdue = 0;
        let safeUpcoming = 0;

        if (balance > 0) {
            safeOverdue = Math.min(balance, overdueRaw);
            safeUpcoming = Math.min(balance - safeOverdue, upcomingRaw);
        }

        return {
            id: s.id,
            name: s.name,
            phone: s.phone,
            address: s.address,
            balance,
            overdue: safeOverdue,
            upcoming: safeUpcoming
        };
    });

    return result.sort((a, b) => b.balance - a.balance);
}

export async function getSupplier(id: string) {
    return await db.supplier.findUnique({
        where: { id },
        include: {
            transactions: {
                orderBy: { transactionDate: 'desc' }
            }
        }
    });
}

// Helper to get transactions sorted DESC for UI
export async function getSupplierTransactionsRaw(id: string) {
    const raw = await db.supplierTransaction.findMany({
        where: { supplierId: id },
        orderBy: { transactionDate: 'desc' }
    });

    // Serialize Decimal to Number to prevent Client Component errors
    return raw.map(t => ({
        ...t,
        amount: Number(t.amount)
    }));
}

export async function addSupplier(data: { name: string, phone?: string, address?: string }) {
    try {
        const supplier = await db.supplier.create({
            data: {
                name: data.name,
                phone: data.phone,
                address: data.address
            }
        });
        await createAuditLog({
            action: "SUPPLIER_CREATE",
            entity: "Supplier",
            entityId: supplier.id,
            details: `Tedarikçi eklendi: ${supplier.name}`
        });
        revalidatePath("/dashboard/finance");
        return { success: true, message: "Tedarikçi eklendi." };
    } catch (error) {
        return { success: false, message: "Ekleme başarısız." };
    }
}

export async function addTransaction(data: {
    supplierId: string,
    type: number,
    amount: number,
    description: string,
    date: Date,
    dueDate?: Date,
    documentNo?: string
}) {
    try {
        const txn = await db.supplierTransaction.create({
            data: {
                supplierId: data.supplierId,
                type: data.type,
                amount: data.amount,
                description: data.description,
                transactionDate: data.date,
                dueDate: data.dueDate,
                documentNo: data.documentNo,
                isPaid: false
            }
        });
        const supplier = await db.supplier.findUnique({ where: { id: data.supplierId }, select: { name: true } });
        await createAuditLog({
            action: "FINANCE_TRANSACTION",
            entity: "SupplierTransaction",
            entityId: txn.id,
            details: `Finans işlemi: ${data.type === 0 ? "Borç" : "Ödeme"} - ${data.amount} TL (${supplier?.name})`
        });
        revalidatePath(`/dashboard/finance/supplier/${data.supplierId}`);
        revalidatePath("/dashboard/finance");
        return { success: true, message: "İşlem kaydedildi." };
    } catch (error) {
        return { success: false, message: "Kayıt başarısız." };
    }
}

export async function addTransactionBatch(data: {
    supplierId: string,
    transactions: {
        type: number,
        amount: number,
        description: string,
        date: Date,
        dueDate?: Date,
        documentNo?: string
    }[]
}) {
    try {
        // SQLite has a limit on variables (~999 or 32k depending on build). 
        // Safest to chunk inserts. 50 items * ~7 columns = 350 vars, safe.
        const BATCH_SIZE = 50;
        const chunks = [];

        for (let i = 0; i < data.transactions.length; i += BATCH_SIZE) {
            chunks.push(data.transactions.slice(i, i + BATCH_SIZE));
        }

        // Run in sequence or Promise.all - Sequence is safer for DB lock
        for (const chunk of chunks) {
            await db.supplierTransaction.createMany({
                data: chunk.map(t => ({
                    supplierId: data.supplierId,
                    type: t.type, // Usually 0 (Debt)
                    amount: t.amount,
                    description: t.description,
                    transactionDate: t.date,
                    dueDate: t.dueDate,
                    documentNo: t.documentNo,
                    isPaid: false // Ensure default
                }))
            });
        }

        revalidatePath(`/dashboard/finance/supplier/${data.supplierId}`);
        revalidatePath("/dashboard/finance");
        return { success: true, message: `${data.transactions.length} adet işlem kaydedildi.` };
    } catch (error) {
        console.error("Batch Transaction Error:", error);
        return { success: false, message: "Toplu kayıt başarısız. (Veritabanı limiti veya hatası)" };
    }
}

export async function toggleTransactionStatus(id: string, isPaid: boolean) {
    try {
        await db.supplierTransaction.update({
            where: { id },
            data: {
                isPaid,
                paidAt: isPaid ? new Date() : null
            }
        });
        revalidatePath("/dashboard/finance");
        return { success: true };
    } catch (error) {
        console.error("Status Toggle Error:", error);
        return { success: false };
    }
}
