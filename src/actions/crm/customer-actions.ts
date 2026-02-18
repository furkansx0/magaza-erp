"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache";
import { createAuditLog } from "@/actions/settings/audit-actions";

export async function getCustomer(id: string) {
    if (!id) return null;
    return await db.customer.findUnique({
        where: { id },
        include: {
            giftCards: {
                orderBy: { createdAt: 'desc' }
            },
            sales: {
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: {
                    items: {
                        include: { variant: { include: { model: true } } }
                    }
                }
            }
        }
    });
}

// Update Customer Action
export async function updateCustomer(id: string, data: any) {
    try {
        const customer = await db.customer.update({
            where: { id },
            data: {
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                city: data.city || null,
                district: data.district || null,
                type: data.type,
                gender: data.gender || null, // Updated schema
                taxNo: data.taxNo || null,
                taxOffice: data.taxOffice || null,
                channel: data.channel || null,
                notes: data.notes || null,
                birthday: data.birthday ? new Date(data.birthday) : null,
                specialDate: data.specialDate ? new Date(data.specialDate) : null,
                specialDateLabel: data.specialDateLabel || null,
                contactPerson: data.contactPerson || null,
                title: data.title || null,
                paymentTerms: data.paymentTerms || null,
                consentSMS: data.consentSMS || false,
                consentEmail: data.consentEmail || false,
            }
        });

        revalidatePath("/dashboard/customers");
        revalidatePath(`/dashboard/customers/${id}`);

        await createAuditLog({
            action: "CUSTOMER_UPDATE",
            entity: "Customer",
            entityId: id,
            details: `Müşteri güncellendi: ${customer.name}`
        });

        return { success: true, customer };
    } catch (error: any) {
        console.error("Update Customer Error:", error);
        return { success: false, error: error.message || "Güncelleme sırasında bir hata oluştu" };
    }
}
