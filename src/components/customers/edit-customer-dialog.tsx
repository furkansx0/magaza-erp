"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Save, User, Building2, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateCustomer } from "@/actions/crm/customer-actions"

const customerSchema = z.object({
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

interface EditCustomerDialogProps {
    customer: any
}

export function EditCustomerDialog({ customer }: EditCustomerDialogProps) {
    const [open, setOpen] = React.useState(false)
    const [loading, setLoading] = React.useState(false)

    const form = useForm<z.infer<typeof customerSchema>>({
        resolver: zodResolver(customerSchema) as any,
        defaultValues: {
            type: customer.type || "INDIVIDUAL",
            name: customer.name || "",
            phone: customer.phone || "",
            email: customer.email || "",
            gender: customer.gender || undefined,
            address: customer.address || "",
            city: customer.city || "",
            district: customer.district || "",
            taxNo: customer.taxNo || "",
            taxOffice: customer.taxOffice || "",
            contactPerson: customer.contactPerson || "",
            title: customer.title || "",
            birthday: customer.birthday ? new Date(customer.birthday).toISOString().split('T')[0] : "",
            specialDate: customer.specialDate ? new Date(customer.specialDate).toISOString().split('T')[0] : "",
            specialDateLabel: customer.specialDateLabel || "Evlilik Yıldönümü",
            notes: customer.notes || "",
            consentSMS: customer.consentSMS || false,
            consentEmail: customer.consentEmail || false,
        }
    })

    const onSubmit = async (values: z.infer<typeof customerSchema>) => {
        setLoading(true)
        try {
            const res = await updateCustomer(customer.id, values)
            if (res.success) {
                toast.success("Müşteri Bilgileri Güncellendi")
                setOpen(false)
            } else {
                toast.error(res.error)
            }
        } catch (error) {
            toast.error("Bir hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    const type = form.watch("type")

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Düzenle
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Müşteri Bilgilerini Düzenle</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="basic">Genel Bilgiler</TabsTrigger>
                                <TabsTrigger value="details">Adres & Kurumsal</TabsTrigger>
                                <TabsTrigger value="marketing">Pazarlama & Özel</TabsTrigger>
                            </TabsList>

                            {/* --- TAB 1: BASIC INFO --- */}
                            <TabsContent value="basic" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Müşteri Tipi</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seçiniz" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="INDIVIDUAL"><div className="flex items-center gap-2"><User className="h-4 w-4" /> Bireysel</div></SelectItem>
                                                        <SelectItem value="CORPORATE"><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Kurumsal</div></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="phone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Telefon</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="05XX..." {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{type === "CORPORATE" ? "Firma Ünvanı" : "Ad Soyad"}</FormLabel>
                                            <FormControl>
                                                <Input placeholder={type === "CORPORATE" ? "Örnek Ltd. Şti." : "Ahmet Yılmaz"} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {type === "INDIVIDUAL" && (
                                    <FormField
                                        control={form.control}
                                        name="gender"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cinsiyet</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seçiniz" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="MALE">Erkek</SelectItem>
                                                        <SelectItem value="FEMALE">Kadın</SelectItem>
                                                        <SelectItem value="OTHER">Belirtilmemiş</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>E-posta</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="ornek@mail.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {type === "CORPORATE" && (
                                        <FormField
                                            control={form.control}
                                            name="contactPerson"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Yetkili Kişi</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Görüşülecek Kişi" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                </div>
                            </TabsContent>

                            {/* --- TAB 2: ADDRESS & CORPORATE --- */}
                            <TabsContent value="details" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="city"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>İl</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="İstanbul" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="district"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>İlçe</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Kadıköy" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Açık Adres</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Mahalle, Sokak, No..." {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                    {type === "CORPORATE" && (
                                        <FormField
                                            control={form.control}
                                            name="taxOffice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Vergi Dairesi</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <FormField
                                        control={form.control}
                                        name="taxNo"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{type === "CORPORATE" ? "Vergi No" : "TC Kimlik No"}</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder={type === "CORPORATE" ? "Vergi Numarası" : "TC Kimlik Numarası (Fatura İçin)"} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>

                            {/* --- TAB 3: MARKETING & SPECIAL --- */}
                            <TabsContent value="marketing" className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="birthday"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Doğum Günü</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <FormField
                                                control={form.control}
                                                name="specialDateLabel"
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel>Özel Gün Tipi</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Seçiniz" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="Evlilik Yıldönümü">Evlilik Yıldönümü</SelectItem>
                                                                <SelectItem value="Tanışma">Tanışma</SelectItem>
                                                                <SelectItem value="Diğer">Diğer</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="specialDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tarih</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Müşteri Notları</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Müşteri hakkında özel notlar..." {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <div className="flex flex-col gap-4 border p-4 rounded-lg bg-muted/20">
                                    <FormField
                                        control={form.control}
                                        name="consentSMS"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        SMS İzni
                                                    </FormLabel>
                                                    <p className="text-sm text-muted-foreground">
                                                        Kampanya ve bilgilendirme SMS'leri gönderilebilir.
                                                    </p>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="consentEmail"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                                <div className="space-y-1 leading-none">
                                                    <FormLabel>
                                                        E-posta İzni
                                                    </FormLabel>
                                                    <p className="text-sm text-muted-foreground">
                                                        E-bülten ve fatura gönderimi yapılabilir.
                                                    </p>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>İptal</Button>
                            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Değişiklikleri Kaydet
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
