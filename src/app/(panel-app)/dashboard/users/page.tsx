import { prisma } from "@/lib/db"
import { CreateSystemUserDialog } from "@/components/users/create-system-user-dialog"
import { DeleteUserButton } from "@/components/users/delete-user-button" // Reuse or creating new
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function UsersPage() {
    // Only fetch SYSTEM_USERs
    const users = await prisma.user.findMany({
        where: { role: "SYSTEM_USER" },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Yetkilendirme</h2>
                    <p className="text-muted-foreground">Depo, CRM ve Stok yöneticilerini buradan tanımlayın.</p>
                </div>
                <CreateSystemUserDialog />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Sistem Yetkilileri</CardTitle>
                    <CardDescription>
                        Bu kullanıcılar yönetim paneline giriş yapabilir ve sadece yetkili oldukları menülere erişebilir.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Kullanıcı Adı</TableHead>
                                <TableHead>Ad Soyad</TableHead>
                                <TableHead>Yetkiler (Erişim)</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => {
                                let perms = []
                                try {
                                    perms = user.permissions ? JSON.parse(user.permissions) : []
                                } catch (e) { }

                                return (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-mono">{user.username}</TableCell>
                                        <TableCell>{user.name}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {perms.map((p: string) => (
                                                    <Badge key={p} variant="secondary">{p}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <DeleteUserButton userId={user.id} userName={user.name || user.username} />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                        Henüz yetkili tanımlanmamış.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
