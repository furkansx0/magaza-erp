import { getAuditLogs } from "@/actions/settings/audit-actions"
import { format } from "date-fns"
import { tr } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export default async function LogsPage() {
    const logs = await getAuditLogs(undefined, undefined, 100);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-gray-100">İşlem Geçmişi</h1>
                    <p className="text-muted-foreground mt-1">Sistem üzerindeki son işlemler ve denetim kayıtları.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Son Kayıtlar</CardTitle>
                    <CardDescription>Son 100 işlem görüntüleniyor.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[180px]">Tarih</TableHead>
                                    <TableHead className="w-[150px]">Kullanıcı</TableHead>
                                    <TableHead className="w-[120px]">İşlem</TableHead>
                                    <TableHead className="w-[150px]">Varlık</TableHead>
                                    <TableHead>Detaylar</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {format(log.createdAt, "dd MMMM yyyy HH:mm:ss", { locale: tr })}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{log.user?.name || "Bilinmeyen"}</span>
                                                <span className="text-[10px] text-muted-foreground">@{log.user?.username}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-[10px]">
                                                {log.action}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                {log.entity}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                                            {log.details || "-"}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {logs.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            Henüz kayıt bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
