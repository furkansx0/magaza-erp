"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2 } from "lucide-react"
import { runCampaign } from "@/actions/crm/campaign-actions"
import { toast } from "sonner"

export function RunCampaignButton({ campaignId }: { campaignId: string }) {
    const [loading, setLoading] = React.useState(false)

    const handleRun = async () => {
        setLoading(true)
        try {
            const res = await runCampaign(campaignId)
            if (res.success) {
                toast.success(`Kampanya Çalıştırıldı!`, {
                    description: `${res.processedCount} kişiye hediye çeki tanımlandı.`
                })
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button size="icon" variant="outline" onClick={handleRun} disabled={loading} title="Şimdi Çalıştır">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-indigo-600" />}
        </Button>
    )
}
