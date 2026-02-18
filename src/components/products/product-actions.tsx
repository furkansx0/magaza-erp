"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProductWizard } from "./wizard/product-wizard"

interface ProductActionsProps {
    stores: { id: string, name: string }[]
}

export function ProductActions({ stores }: ProductActionsProps) {
    const [wizardOpen, setWizardOpen] = React.useState(false)

    return (
        <>
            <Button onClick={() => setWizardOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
            </Button>
            <ProductWizard open={wizardOpen} onOpenChange={setWizardOpen} stores={stores} />
        </>
    )
}
