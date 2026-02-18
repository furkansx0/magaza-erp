"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FilterX } from "lucide-react"

interface FilterSidebarProps {
    facets: {
        brands: string[];
        categories: string[];
    }
}

export function ProductFilterSidebar({ facets }: FilterSidebarProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const updateFilter = (key: string, value: string, checked: boolean) => {
        const params = new URLSearchParams(searchParams.toString())

        let current = params.getAll(key)
        if (checked) {
            current.push(value)
        } else {
            current = current.filter(v => v !== value)
        }

        params.delete(key) // clear all to reset order/duplicates logic if needed, but getAll/append is safer
        // Actually, just delete key and re-append all valid ones
        // But better approach:
        const newValues = checked
            ? [...params.getAll(key), value]
            : params.getAll(key).filter(v => v !== value)

        params.delete(key)
        newValues.forEach(v => params.append(key, v))

        // Reset page on filter change
        params.set("page", "1")

        router.push(`?${params.toString()}`)
    }

    const clearFilters = () => {
        router.push("/dashboard/products")
    }

    // Checking if a value is selected
    const isChecked = (key: string, value: string) => {
        return searchParams.getAll(key).includes(value)
    }

    // Define hardcoded filters for Demo attributes (as they are dynamic in DB but static in UI for now)
    const SEASONS = ["2024 Yaz", "2024 Kış", "2025 Yaz"]
    const MATERIALS = ["Deri", "Süet", "Nubuk", "Tekstil"]

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Filtreler</h3>
                {(searchParams.toString().length > 0) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                        <FilterX className="mr-2 h-3 w-3" /> Temizle
                    </Button>
                )}
            </div>

            <Accordion type="multiple" defaultValue={["brand", "category", "season", "material"]} className="w-full">
                {/* Brand Filter */}
                <AccordionItem value="brand">
                    <AccordionTrigger>Marka</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {facets.brands.map((brand) => (
                                <div key={brand} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`brand-${brand}`}
                                        checked={isChecked("brand", brand)}
                                        onCheckedChange={(c) => updateFilter("brand", brand, !!c)}
                                    />
                                    <Label htmlFor={`brand-${brand}`} className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {brand}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Category Filter */}
                <AccordionItem value="category">
                    <AccordionTrigger>Kategori</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2">
                            {facets.categories.map((cat) => (
                                <div key={cat} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`cat-${cat}`}
                                        checked={isChecked("category", cat)}
                                        onCheckedChange={(c) => updateFilter("category", cat, !!c)}
                                    />
                                    <Label htmlFor={`cat-${cat}`} className="text-sm font-normal cursor-pointer leading-none">
                                        {cat}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Season Filter (Attribute) */}
                <AccordionItem value="season">
                    <AccordionTrigger>Sezon</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2">
                            {SEASONS.map((season) => (
                                <div key={season} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`season-${season}`}
                                        checked={isChecked("season", season)}
                                        onCheckedChange={(c) => updateFilter("season", season, !!c)}
                                    />
                                    <Label htmlFor={`season-${season}`} className="text-sm font-normal cursor-pointer leading-none">
                                        {season}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* Material Filter (Attribute) */}
                <AccordionItem value="material">
                    <AccordionTrigger>Materyal</AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-2">
                            {MATERIALS.map((mat) => (
                                <div key={mat} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`mat-${mat}`}
                                        checked={isChecked("material", mat)}
                                        onCheckedChange={(c) => updateFilter("material", mat, !!c)}
                                    />
                                    <Label htmlFor={`mat-${mat}`} className="text-sm font-normal cursor-pointer leading-none">
                                        {mat}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>

            </Accordion>
        </div>
    )
}
