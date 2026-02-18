"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { updateProfile } from "@/actions/settings/settings-actions"
import { logout } from "@/actions/settings/auth"
import { LogOut, Save, User, Lock } from "lucide-react"

interface SettingsFormProps {
    initialUsername: string
}

export function SettingsForm({ initialUsername }: SettingsFormProps) {
    const [loading, setLoading] = useState(false)
    const [username, setUsername] = useState(initialUsername)
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await updateProfile({
                username,
                currentPassword: currentPassword || undefined,
                newPassword: newPassword || undefined
            })

            if (res.success) {
                toast.success(res.message)
                setCurrentPassword("")
                setNewPassword("")
            } else {
                toast.error(res.error)
            }
        } catch (err) {
            toast.error("Bir hata oluştu")
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await logout()
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        Profil Ayarları
                    </CardTitle>
                    <CardDescription>
                        Kullanıcı adı ve şifrenizi buradan güncelleyebilirsiniz.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleUpdate}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Kullanıcı Adı</Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Kullanıcı adı"
                            />
                        </div>

                        <div className="space-y-2 pt-2 border-t">
                            <Label htmlFor="current-pass">Mevcut Şifre (Değişiklik için gerekli)</Label>
                            <div className="relative">
                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    id="current-pass"
                                    type="password"
                                    className="pl-9"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    placeholder="*******"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-pass">Yeni Şifre (İsteğe bağlı)</Label>
                            <div className="relative">
                                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    id="new-pass"
                                    type="password"
                                    className="pl-9"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Yeni şifreniz"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                        <div className="text-xs text-muted-foreground mr-4">
                            Şifre değiştirmek istemiyorsanız boş bırakın.
                        </div>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? "Kaydediliyor..." : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Değişiklikleri Kaydet
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card className="border-red-100 bg-red-50/10">
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                        <LogOut className="h-5 w-5" />
                        Oturum
                    </CardTitle>
                    <CardDescription>
                        Sistemden güvenli çıkış yapın.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
                        <LogOut className="mr-2 h-4 w-4" />
                        Çıkış Yap
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
