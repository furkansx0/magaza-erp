"use client"

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"; // Note: SheetTrigger is used in the parent usually, but here we might control open state
import { createProduct } from "@/actions/inventory/product-actions";
import { getSettingByKey } from "@/actions/settings/settings-actions";
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Re-defining schema here for client-side usage matching the server
const formSchema = z.object({
    name: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır."),
    barcode: z.string().min(3, "Barkod gereklidir."),
    category: z.string().optional(),
    purchasePrice: z.string().refine((val) => !isNaN(Number(val)), "Geçerli bir sayı giriniz."),
    salePrice: z.string().refine((val) => !isNaN(Number(val)), "Geçerli bir sayı giriniz."),
    attributes: z.record(z.any()).optional(),
});

interface ProductFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProductForm({ open, onOpenChange }: ProductFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            barcode: "",
            category: "",
            purchasePrice: "",
            salePrice: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            // Convert strings to numbers for the server action
            const result = await createProduct({
                ...values,
                purchasePrice: parseFloat(values.purchasePrice),
                salePrice: parseFloat(values.salePrice),
                attributes: values.attributes ? JSON.stringify(values.attributes) : undefined,
            });

            if (result.success) {
                toast.success(result.message);
                form.reset();
                onOpenChange(false);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Beklenmedik bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Yeni Ürün Ekle</SheetTitle>
                    <SheetDescription>
                        Yeni bir ürünü sisteme eklemek için bilgileri doldurun.
                    </SheetDescription>
                </SheetHeader>
                <div className="py-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ürün Adı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Örn: iPhone 15 Kılıf" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Barkod</FormLabel>
                                        <FormControl>
                                            <Input placeholder="869..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="purchasePrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Alış Fiyatı (₺)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="salePrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Satış Fiyatı (₺)</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                    </FormItem>
                                )}
                            />

                        {/* DYNAMIC ATTRIBUTES SECTION */}
                        <DynamicAttributesSection form={form} />

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Kaydet
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </SheetContent>
        </Sheet >
    );
}
