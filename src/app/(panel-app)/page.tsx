"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, ShieldCheck, Activity } from "lucide-react"
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

export default function Home() {
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
        window.location.href = result.redirectUrl || "/dashboard"
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">

      {/* Header / Branding Area */}
      <div className="text-center mb-8 space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">
            KLJ SİSTEM
          </h1>
        </div>

        
        <p className="text-muted-foreground text-sm pt-2">Yetkili personel girişi yapınız</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardHeader className="space-y-1 text-center pb-6">
          <CardTitle className="text-2xl font-bold">Sisteme Giriş</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-gray-700 dark:text-gray-300">Kullanıcı Adı</FormLabel>
                    <FormControl>
                      <Input className="h-12 bg-white dark:bg-zinc-900 transition-all focus:ring-2 focus:ring-blue-500" placeholder="kullanıcı" {...field} disabled={isLoading} />
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
                    <FormLabel className="font-semibold text-gray-700 dark:text-gray-300">Şifre</FormLabel>
                    <FormControl>
                      <Input className="h-12 bg-white dark:bg-zinc-900 transition-all focus:ring-2 focus:ring-blue-500" placeholder="••••••••" type="password"  {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 font-bold text-md mt-4 shadow-lg hover:shadow-xl transition-all" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Giriş Yapılıyor...
                  </>
                ) : (
                  "Giriş Yap"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      
    </div>
  )
}
