import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PrintButton } from "./print-button" // Client component for print logic

export default async function ReceiptPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    const sale = await db.sale.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    variant: {
                        include: { model: true }
                    }
                }
            },
            customer: true,
            cashier: true,
            store: true
        }
    })

    if (!sale) return notFound()

    return (
        <div className="max-w-[80mm] mx-auto bg-white p-4 text-xs font-mono text-black leading-tight print:max-w-none print:p-0">
            {/* Header */}
            <div className="text-center mb-4 border-b pb-2 border-black border-dashed">
                <h1 className="text-sm font-bold mb-1">{sale.store.name}</h1>
                <p className="mb-1">{sale.store.address || "Merkez Şube"}</p>
                <p>{sale.store.phone}</p>
            </div>

            {/* Info */}
            <div className="mb-4">
                <div className="flex justify-between">
                    <span>Tarih:</span>
                    <span>{sale.createdAt.toLocaleDateString("tr-TR")} {sale.createdAt.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                    <span>Fiş No:</span>
                    <span>{sale.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Kasiyer:</span>
                    <span>{sale.cashier.name || sale.cashier.username}</span>
                </div>
                {sale.customer && (
                    <div className="flex justify-between border-t border-black border-dashed mt-1 pt-1">
                        <span>Müşteri:</span>
                        <span className="font-bold">{sale.customer.name}</span>
                    </div>
                )}
            </div>

            {/* Items */}
            <table className="w-full mb-4">
                <thead>
                    <tr className="border-b border-black text-left">
                        <th className="pb-1">Ürün</th>
                        <th className="pb-1 text-center">Adet</th>
                        <th className="pb-1 text-right">Tutar</th>
                    </tr>
                </thead>
                <tbody className="text-[11px]">
                    {sale.items.map((item, i) => (
                        <tr key={i}>
                            <td className="pt-1 pr-1 truncate max-w-[100px]">
                                {item.variant.model.name}
                                <br />
                                <span className="text-[10px]">{item.variant.size}/{item.variant.color}</span>
                            </td>
                            <td className="pt-1 text-center align-top">{item.quantity}</td>
                            <td className="pt-1 text-right align-top">
                                {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(item.price) * item.quantity)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-black border-dashed pt-2 mb-6">
                <div className="flex justify-between text-base font-bold">
                    <span>TOPLAM:</span>
                    <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(sale.totalAmount))}</span>
                </div>
                <div className="flex justify-between text-[10px] mt-1">
                    <span>KDV (%10):</span>
                    <span>{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(sale.totalAmount) * 0.1)}</span>
                </div>
                <div className="flex justify-between text-xs mt-2 border-t border-black pt-1">
                    <span>Ödeme Tipi:</span>
                    <span>{sale.paymentMethod === "CASH" ? "NAKİT" : "KREDİ KARTI"}</span>
                </div>
            </div>

            <div className="text-center text-[10px] mb-8">
                <p>Mali değeri yoktur.</p>
                <p>Bizi tercih ettiğiniz için teşekkürler!</p>
            </div>

            <div className="print:hidden text-center">
                <PrintButton />
            </div>
        </div>
    )
}
