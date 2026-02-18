"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createCampaign } from "@/actions/crm/campaign-actions"

const campaignSchema = z.object({
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
    validityDays: z.string().default("30"),
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

export function NewCampaignDialog() {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const form = useForm<z.infer<typeof campaignSchema>>({
        resolver: zodResolver(campaignSchema),
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

    const onSubmit = async (values: z.infer<typeof campaignSchema>) => {
        setLoading(true)
        try {
            const res = await createCampaign(values)
            if (res.success) {
                toast.success("Kampanya oluşturuldu")
                setOpen(false)
                form.reset()
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    const triggerType = form.watch("triggerType");
    const rewardType = form.watch("rewardType");

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Yeni Kampanya
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Yeni Otomatik Kampanya</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Kampanya Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: Kadınlar Günü İndirimi" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="triggerType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tetikleyici</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seçiniz" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="MANUAL">Manuel (Ben Başlatırım)</SelectItem>
                                                <SelectItem value="BIRTHDAY">Doğum Günü Otomasyonu</SelectItem>
                                                <SelectItem value="DATE">Belirli Bir Tarihte</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription className="text-xs">
                                            Ne zaman çalışacak?
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                            {triggerType === "DATE" && (
                                <FormField
                                    control={form.control}
                                    name="triggerDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tarih</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <div className="space-y-2 border p-3 rounded-md bg-muted/20">
                            <h4 className="text-sm font-medium">Hedef Kitle Filtreleri</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="targetGender"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cinsiyet</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="ALL">Tümü</SelectItem>
                                                    <SelectItem value="MALE">Erkekler</SelectItem>
                                                    <SelectItem value="FEMALE">Kadınlar</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="targetCity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Şehir (Opsiyonel)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Örn: İstanbul" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 border p-3 rounded-md bg-green-50/50 border-green-100">
                            <h4 className="text-sm font-medium text-green-800">Hediye / Ödül</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="rewardType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tip</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="FIXED">Sabit Tutar (TL)</SelectItem>
                                                    <SelectItem value="PERCENTAGE">Yüzde (%)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                {rewardType === "FIXED" ? (
                                    <FormField
                                        control={form.control}
                                        name="giftAmount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tutar (TL)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="100" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ) : (
                                    <FormField
                                        control={form.control}
                                        name="giftPercentage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Oran (%)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="10" {...field} max="100" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                            <FormField
                                control={form.control}
                                name="validityDays"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Geçerlilik Süresi (Gün)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Çek oluşturulduktan sonra kaç gün geçerli?
                                        </FormDescription>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Kampanyayı Oluştur
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
