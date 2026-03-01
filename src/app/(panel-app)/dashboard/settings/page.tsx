"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { updateOwnProfile } from "@/actions/settings/user-actions"

// === SCHEMAS ===
const profileSchema = z.object({
    currentUsername: z.string().min(1, {
        message: "Mevcut kullanıcı adınızı girmelisiniz.",
    }),
    currentPassword: z.string().min(1, {
        message: "Değişiklik yapabilmek için mevcut şifrenizi girmelisiniz.",
    }),
    username: z.string().min(2, {
        message: "Yeni kullanıcı adı en az 2 karakter olmalıdır.",
    }),
    password: z.string().optional(),
    passwordConfirm: z.string().optional()
}).refine((data) => {
    // If password is provided, it must match passwordConfirm
    if (data.password && data.password.length > 0) {
        return data.password === data.passwordConfirm;
    }
    return true;
}, {
    message: "Şifreler birbiriyle eşleşmiyor",
    path: ["passwordConfirm"],
}).refine((data) => {
    // If password is provided, it must be at least 4 chars
    if (data.password && data.password.length > 0) {
        return data.password.length >= 4;
    }
    return true;
}, {
    message: "Şifre en az 4 karakter olmalıdır.",
    path: ["password"],
});

export default function SettingsPage() {
    // === STATE ===
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            currentUsername: "",
            currentPassword: "",
            username: "",
            password: "",
            passwordConfirm: "",
        },
    });

    // === HANDLERS ===
    async function onSubmit(values: z.infer<typeof profileSchema>) {
        setIsLoading(true);

        try {
            const dataToUpdate = {
                currentUsername: values.currentUsername,
                currentPassword: values.currentPassword,
                username: values.username,
                password: values.password || undefined
            };

            const result = await updateOwnProfile(dataToUpdate);

            if (result.success) {
                toast.success("Bilgileriniz başarıyla güncellendi.");

                // Clear fields
                form.reset();

                // Reload session
                router.refresh();
            } else {
                toast.error(result.error || "Güncelleme başarısız.");
            }
        } catch (error) {
            toast.error("Bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    }

    // === RENDER ===
    return (
        <div className="flex justify-center p-6">
            <Card className="w-full max-w-xl">
                <CardHeader>
                    <CardTitle>Güvenlik & Profil</CardTitle>
                    <CardDescription>
                        Kullanıcı adınızı ve şifrenizi değiştirmek için aşağıdaki formu kullanın.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            
                            {/* Eski Kullanıcı Adı & Şifre Grubu */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
                                <FormField
                                    control={form.control}
                                    name="currentUsername"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Eski Kullanıcı Adınız</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="currentPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Eski Şifreniz</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Yeni Kullanıcı Adı */}
                            <FormField
                                control={form.control}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Yeni Kullanıcı Adı</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                            />

                            {/* Yeni Şifre Grubu (Simetrik Olan Yer) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Yeni Şifre</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="passwordConfirm"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Yeni Şifre Tekrar</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} disabled={isLoading} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* İşte o ortak not alanı burada durmalı */}
                            <p className="text-xs text-muted-foreground mt-2 px-1">
                                * Şifrenizi değiştirmek istemiyorsanız bu alanları boş bırakabilirsiniz.
                            </p>

                            {/* Kaydet Butonu */}
                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Güncelleniyor...
                                        </>
                                    ) : (
                                        "Kaydet"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}