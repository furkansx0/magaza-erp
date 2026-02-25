import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createProductCampaign } from "@/actions/crm/campaign-product-actions"
import { toast } from "sonner"

// DTO and Schema
export const campaignFormSchema = z.object({
    name: z.string().min(2, "Kampanya adı en az 2 karakter olmalıdır"),
    buyQuantity: z.coerce.number().min(0).default(1),
    getQuantity: z.coerce.number().min(0).default(1),
    discountPercent: z.coerce.number().min(0).max(100).default(100),
    applyTo: z.enum(["CHEAPEST", "EXPENSIVE"]).default("CHEAPEST"),
    targetCategoryIds: z.array(z.string()).default([]),
    targetBrandIds: z.array(z.string()).default([]),
    storeIds: z.array(z.string()).default([]).optional(),
})

export type CampaignFormValues = z.infer<typeof campaignFormSchema>

export function useProductCampaignForm(onSuccessAction?: () => void) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<CampaignFormValues>({
        resolver: zodResolver(campaignFormSchema) as any,
        defaultValues: {
            name: "",
            buyQuantity: 1,
            getQuantity: 1,
            discountPercent: 100, // Free
            applyTo: "CHEAPEST",
            targetCategoryIds: [],
            targetBrandIds: [],
            storeIds: []
        },
    })

    const formValues = form.watch()

    const toggleCategory = (cat: string) => {
        const current = form.getValues("targetCategoryIds");
        if (current.includes(cat)) {
            form.setValue("targetCategoryIds", current.filter(c => c !== cat), { shouldValidate: true });
        } else {
            form.setValue("targetCategoryIds", [...current, cat], { shouldValidate: true });
        }
    }

    const toggleBrand = (brand: string) => {
        const current = form.getValues("targetBrandIds");
        if (current.includes(brand)) {
            form.setValue("targetBrandIds", current.filter(b => b !== brand), { shouldValidate: true });
        } else {
            form.setValue("targetBrandIds", [...current, brand], { shouldValidate: true });
        }
    }

    async function onSubmit(values: CampaignFormValues) {
        setIsLoading(true)
        try {
            // DTO Transformation Layer: Translating UI Form variables to Backend PRISMA strict types.
            const dbRules = {
                buyQuantity: values.buyQuantity,
                getQuantity: values.buyQuantity === 0 ? 999999 : values.getQuantity,
                discountPercent: values.discountPercent,
                applyTo: values.applyTo,
                target: {
                    categoryIds: values.targetCategoryIds,
                    brandIds: values.targetBrandIds
                }
            };

            // Business Logic Check for DB ENUM `type`
            let type = "BOGO";
            if (values.buyQuantity === 0) type = "DISCOUNT";
            else if (values.buyQuantity === 1 && values.getQuantity === 1 && values.discountPercent === 100) type = "BOGO";

            const payloadParams = {
                name: values.name,
                description: "",
                isActive: true,
                startDate: new Date(),
                storeIds: values.storeIds || [],
                type: type,
                rules: JSON.stringify(dbRules)
            };

            const result = await createProductCampaign(payloadParams);

            if (result.success) {
                toast.success("Kampanya oluşturuldu!");
                form.reset()
                if (onSuccessAction) onSuccessAction();
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        } finally {
            setIsLoading(false)
        }
    }

    return {
        form,
        formValues,
        isLoading,
        onSubmit: form.handleSubmit(onSubmit),
        toggleCategory,
        toggleBrand
    }
}
