"use client"

import * as React from "react"
import { useCampaignForm } from "./hooks/useCampaignForm"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"

export function NewCampaignDialog() {
    const [open, setOpen] = useState(false)
    const { form, loading, triggerType, rewardType, onSubmit } = useCampaignForm(() => setOpen(false));

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
                    <form onSubmit={onSubmit} className="space-y-4">

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
