import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Filter, Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface MultiSelectFilterProps {
    title: string
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
}

export function MultiSelectFilter({ title, options, selected, onChange }: MultiSelectFilterProps) {
    const [search, setSearch] = React.useState("")
    const filteredOptions = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 border-dashed text-[10px] px-2 w-full justify-start font-normal bg-gray-50 border-gray-300">
                    <Filter className="mr-2 h-3 w-3" />
                    {title}
                    {selected.length > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-3" />
                            <div className="hidden space-x-1 lg:flex">
                                {selected.length > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal text-[10px] h-5">
                                        {selected.length} seçili
                                    </Badge>
                                ) : (
                                    selected.map((option) => (
                                        <Badge
                                            variant="secondary"
                                            key={option}
                                            className="rounded-sm px-1 font-normal text-[10px] h-5"
                                        >
                                            {option}
                                        </Badge>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-2 pb-2">
                    <Input
                        placeholder="Ara..."
                        className="h-8 text-xs"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="max-h-[200px] overflow-auto p-1 space-y-1">
                    {filteredOptions.length === 0 && <div className="text-center text-xs p-2 text-gray-500">Sonuç yok.</div>}
                    {filteredOptions.map(option => {
                        const isSelected = selected.includes(option)
                        return (
                            <div
                                key={option}
                                className={cn(
                                    "flex items-center space-x-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-accent hover:text-accent-foreground",
                                    isSelected && "bg-accent"
                                )}
                                onClick={() => {
                                    if (isSelected) {
                                        onChange(selected.filter(s => s !== option))
                                    } else {
                                        onChange([...selected, option])
                                    }
                                }}
                            >
                                <div className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                )}>
                                    <Check className="h-3 w-3" />
                                </div>
                                <span className="text-xs flex-1 truncate">{option}</span>
                            </div>
                        )
                    })}
                </div>
                {selected.length > 0 && (
                    <>
                        <Separator />
                        <div className="p-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-[10px] h-7"
                                onClick={() => onChange([])}
                            >
                                Temizle
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    )
}
