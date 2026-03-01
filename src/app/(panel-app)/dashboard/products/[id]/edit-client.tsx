"use client"

import { ProductWizard } from "@/components/products/wizard/product-wizard"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function EditProductClient({ product, stores }: { product: any, stores: any[] }) {
    const router = useRouter()
    const [open, setOpen] = useState(true)

    return (
        <ProductWizard
            open={open}
            onOpenChange={(val) => {
                setOpen(val)
                if (!val) {
                    router.push("/dashboard/products") // Go back on close
                }
            }}
            stores={stores}
            initialProduct={product}
        />
    )
}
