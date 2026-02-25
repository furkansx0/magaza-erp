"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Store, LayoutDashboard } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { login } from "@/actions/settings/auth"
import { toast } from "sonner"

const formSchema = z.object({
    username: z.string().min(2, {
        message: "Kullanıcı adı en az 2 karakter olmalıdır.",
    }),
    password: z.string().min(4, {
        message: "Şifre en az 4 karakter olmalıdır.",
    }),
})

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true)

        try {
            const formData = new FormData()
            formData.append("username", values.username)
            formData.append("password", values.password)

            const result = await login(formData)

            if (result?.success) {
                toast.success("Giriş başarılı, yönlendiriliyorsunuz...")
                window.location.href = result.redirectUrl || "/dashboard" // Force hard reload/redirect to ensure middleware kicks in cleanly
            } else {
                toast.error(result?.message || "Giriş başarısız.")
            }
        } catch (error) {
            toast.error("Bir hata oluştu.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Hoş Geldiniz</CardTitle>
                    <CardDescription>
                        Lütfen devam etmek için giriş yapınız.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kullanıcı Adı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="kullanici" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Şifre</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢" {...field} disabled={isLoading} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Giriş Yapılıyor...
                                    </>
                                ) : (
                                    "Giriş Yap"
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 text-center text-xs text-muted-foreground">
                    <div>
                        <span className="font-semibold">Demo Hesaplar:</span>
                    </div>
                    <div className="flex justify-center gap-4">
                        <div className="flex items-center gap-1">
                            <LayoutDashboard className="h-3 w-3" />
                            admin / admin123
                        </div>
                        <div className="flex items-center gap-1">
                            <Store className="h-3 w-3" />
                            magaza1 / 1234
                        </div>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
