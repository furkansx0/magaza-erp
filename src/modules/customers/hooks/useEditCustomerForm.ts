import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { updateCustomer } from "@/actions/crm/customer-actions"

export const customerSchema = z.object({
    type: z.enum(["INDIVIDUAL", "CORPORATE"]),
    name: z.string().min(2, "Ad Soyad / Ünvan gereklidir"),
    phone: z.string().optional(),
    email: z.string().email("Geçersiz e-posta").optional().or(z.literal("")),
    gender: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    taxNo: z.string().optional(),
    taxOffice: z.string().optional(),
    contactPerson: z.string().optional(),
    title: z.string().optional(),
    birthday: z.string().optional(),
    specialDate: z.string().optional(),
    specialDateLabel: z.string().optional(),
    notes: z.string().optional(),
    consentSMS: z.boolean().default(false),
    consentEmail: z.boolean().default(false),
})

export type CustomerFormValues = z.infer<typeof customerSchema>;

export function useEditCustomerForm(customer: any, onSuccessAction?: () => void) {
    const [loading, setLoading] = useState(false)

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema) as any,
        defaultValues: {
            type: customer?.type || "INDIVIDUAL",
            name: customer?.name || "",
            phone: customer?.phone || "",
            email: customer?.email || "",
            gender: customer?.gender || undefined,
            address: customer?.address || "",
            city: customer?.city || "",
            district: customer?.district || "",
            taxNo: customer?.taxNo || "",
            taxOffice: customer?.taxOffice || "",
            contactPerson: customer?.contactPerson || "",
            title: customer?.title || "",
            birthday: customer?.birthday ? new Date(customer.birthday).toISOString().split('T')[0] : "",
            specialDate: customer?.specialDate ? new Date(customer.specialDate).toISOString().split('T')[0] : "",
            specialDateLabel: customer?.specialDateLabel || "Evlilik Yıldönümü",
            notes: customer?.notes || "",
            consentSMS: customer?.consentSMS || false,
            consentEmail: customer?.consentEmail || false,
        }
    })

    const type = form.watch("type")

    const onSubmit = async (values: CustomerFormValues) => {
        setLoading(true)
        try {
            const res = await updateCustomer(customer.id, values as any) // Type safe backend transition wrapper
            if (res.success) {
                toast.success("Müşteri Bilgileri Güncellendi")
                if (onSuccessAction) onSuccessAction();
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    return {
        form,
        loading,
        type,
        onSubmit: form.handleSubmit(onSubmit)
    }
}
