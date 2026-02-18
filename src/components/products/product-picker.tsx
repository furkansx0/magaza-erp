
import * as React from "react"
import { Check, ChevronsUpDown, Search, Package, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { searchProductsForTransfer } from "@/actions/inventory/transfer-recommendation-actions"
import { Badge } from "@/components/ui/badge"

interface ProductPickerProps {
    onSelect: (variantIds: string[]) => void
    trigger?: React.ReactNode
}

export function ProductPicker({ onSelect, trigger }: ProductPickerProps) {
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")
    const [results, setResults] = React.useState<any[]>([])
    const [loading, setLoading] = React.useState(false)

    // Debounced search
    React.useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length > 1) {
                setLoading(true)
                const data = await searchProductsForTransfer(searchTerm)
                setResults(data)
                setLoading(false)
            } else {
                setResults([])
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [searchTerm])

    const handleSelect = (id: string) => {
        onSelect([id])
        setOpen(false)
        setSearchTerm("")
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                    >
                        <span className="flex items-center text-muted-foreground"><Search className="w-4 h-4 mr-2" /> Ürün veya Model Ara...</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                )}
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Ürün adı, barkod veya model kodu..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                    />
                    <CommandList>
                        {loading && <CommandEmpty>Aranıyor...</CommandEmpty>}
                        {!loading && results.length === 0 && searchTerm.length > 1 && (
                            <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
                        )}
                        {!loading && results.length > 0 && (
                            <CommandGroup heading="Sonuçlar">
                                {results.map((product) => (
                                    <CommandItem
                                        key={product.id}
                                        value={product.id}
                                        onSelect={() => handleSelect(product.id)}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-xs">{product.name}</span>
                                                <span className="text-[10px] text-muted-foreground flex gap-2">
                                                    <span>Barkod: {product.barcode}</span>
                                                    <span>Kod: {product.sku || '-'}</span>
                                                </span>
                                            </div>
                                            <Badge variant={product.stockTotal > 0 ? "outline" : "secondary"} className="ml-2 whitespace-nowrap">
                                                Stok: {product.stockTotal}
                                            </Badge>
                                        </div>
                                        <Check className="ml-2 h-4 w-4 opacity-0" />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
