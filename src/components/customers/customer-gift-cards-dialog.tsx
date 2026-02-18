"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Ticket } from "lucide-react"
import { GiftCardList } from "./gift-card-list"
import { useSearchParams, useRouter, usePathname } from "next/navigation"

export function CustomerGiftCardsDialog({
    customer,
    giftCards,
    trigger
}: {
    customer: any,
    giftCards: any[],
    trigger?: React.ReactNode
}) {
    const [isOpen, setIsOpen] = useState(false)
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const highlightId = searchParams.get("giftCardId")

    useEffect(() => {
        if (highlightId) {
            setIsOpen(true)
        }
    }, [highlightId])

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (!open && highlightId) {
            // Clear the param when closing
            const params = new URLSearchParams(searchParams.toString())
            params.delete("giftCardId")
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="h-9 gap-2">
                        <Ticket className="h-4 w-4" />
                        Hediye Çekleri ({giftCards.length})
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Müşteri Hediye Çekleri</DialogTitle>
                </DialogHeader>
                <div className="max-h-[600px] overflow-y-auto p-1">
                    <GiftCardList
                        customer={customer}
                        giftCards={giftCards}
                        highlightId={highlightId}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}
