"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { useEffect } from "react"

export function PrintButton() {
    useEffect(() => {
        // Auto print when opened
        const timeout = setTimeout(() => {
            window.print()
        }, 500)
        return () => clearTimeout(timeout)
    }, [])

    return (
        <Button onClick={() => window.print()} className="w-full">
            <Printer className="mr-2 h-4 w-4" />
            Yazdır
        </Button>
    )
}
