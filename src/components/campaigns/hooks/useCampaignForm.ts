import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { createCampaign } from "@/actions/crm/campaign-actions"

export const campaignSchema = z.object({
    name: z.string().min(2, "Kampanya adı gereklidir"),
    description: z.string().optional(),
    triggerType: z.enum(["MANUAL", "BIRTHDAY", "DATE"]),
    triggerDate: z.string().optional(),

    // Filters
    targetGender: z.string().optional(),
    targetCity: z.string().optional(),
    targetType: z.string().optional(),

    // Reward
    rewardType: z.enum(["FIXED", "PERCENTAGE"]),
    giftAmount: z.string().optional(),
    giftPercentage: z.string().optional(),
    validityDays: z.string().optional(),
}).refine(data => {
    if (data.triggerType === "DATE" && !data.triggerDate) return false;
    return true;
}, {
    message: "Tarih seçimi zorunludur",
    path: ["triggerDate"]
}).refine(data => {
    if (data.rewardType === "FIXED" && !data.giftAmount) return false;
    if (data.rewardType === "PERCENTAGE" && !data.giftPercentage) return false;
    return true;
}, {
    message: "Ödül miktarı girilmelidir",
    path: ["rewardType"]
});

export type CampaignFormValues = z.infer<typeof campaignSchema>

export function useCampaignForm(onSuccessAction?: () => void) {
    const [loading, setLoading] = useState(false)

    const form = useForm<CampaignFormValues>({
        resolver: zodResolver(campaignSchema) as any, // Cast to any to bypass strict unmapped schema types
        defaultValues: {
            name: "",
            description: "",
            triggerType: "MANUAL",
            targetGender: "ALL",
            targetType: "ALL",
            targetCity: "",
            rewardType: "FIXED",
            validityDays: "30",
            giftAmount: "",
            giftPercentage: "",
        }
    })

    const triggerType = form.watch("triggerType");
    const rewardType = form.watch("rewardType");

    const onSubmit = async (values: CampaignFormValues) => {
        setLoading(true)
        try {
            // Frontend'de String/Number payload hatalarını önlemek için Backend'e veri as any gitmesin istiyoruz,
            // ama varolan implementation'ı korurken any tip atlamasını hook içine hapsetmiş oluyoruz.
            const res = await createCampaign(values as any)

            if (res.success) {
                toast.success("Kampanya oluşturuldu")
                form.reset()
                if (onSuccessAction) onSuccessAction();
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    return {
        form,
        loading,
        triggerType,
        rewardType,
        onSubmit: form.handleSubmit(onSubmit)
    }
}
