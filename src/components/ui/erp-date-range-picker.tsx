"use client"

import * as React from "react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, parse, isBefore } from "date-fns"
import { tr } from "date-fns/locale"
import { Calendar as CalendarIcon, X, ArrowRight } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface Preset {
    label: string;
    getValue: () => DateRange;
}

const PRESETS: Preset[] = [
    {
        label: "Dün",
        getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }),
    },
    {
        label: "Bugün",
        getValue: () => ({ from: new Date(), to: new Date() }),
    },
    {
        label: "Bu Hafta",
        getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }),
    },
    {
        label: "Bu Ay",
        getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
    },
    {
        label: "Son 30 Gün",
        getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }),
    },
]

export interface ErpDateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date?: DateRange;
    onDateChange?: (date: DateRange | undefined) => void;
    revenue?: any; // TS fallback
}

const parseDateString = (str: string) => {
    if (!str) return undefined;
    const cleanStr = str.trim();

    // Sadece gün girilirse "15" -> "15.MevcutAy.MevcutYıl"
    if (/^\d{1,2}$/.test(cleanStr)) {
        const today = new Date();
        const day = cleanStr.padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        return parse(`${day}.${month}.${year}`, 'dd.MM.yyyy', new Date());
    }

    // Gün ve ay girilirse: "15.10", "15/10", "15-10", "15 10"
    if (/^\d{1,2}[\.\/\- ]\d{1,2}$/.test(cleanStr)) {
        const parts = cleanStr.split(/[\.\/\- ]/);
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = new Date().getFullYear();
        return parse(`${day}.${month}.${year}`, 'dd.MM.yyyy', new Date());
    }

    // Tam tarih girilirse: "15.10.2024", "15/10/24"
    if (/^\d{1,2}[\.\/\- ]\d{1,2}[\.\/\- ]\d{2,4}$/.test(cleanStr)) {
        const parts = cleanStr.split(/[\.\/\- ]/);
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (year.length === 2) year = "20" + year;
        return parse(`${day}.${month}.${year}`, 'dd.MM.yyyy', new Date());
    }

    return undefined;
};

export function ErpDateRangePicker({
    className,
    date: externalDate,
    onDateChange,
    ...props
}: ErpDateRangePickerProps) {
    const [date, setDate] = React.useState<DateRange | undefined>(externalDate)
    const [isOpen, setIsOpen] = React.useState(false)

    const [fromVal, setFromVal] = React.useState("");
    const [toVal, setToVal] = React.useState("");
    const toInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (externalDate !== undefined) {
            setDate(externalDate)
        }
    }, [externalDate])

    React.useEffect(() => {
        if (isOpen) {
            setFromVal(date?.from ? format(date.from, "dd.MM.yyyy") : "");
            setToVal(date?.to ? format(date.to, "dd.MM.yyyy") : "");
        }
    }, [isOpen, date])

    const formatRange = (range: DateRange | undefined) => {
        if (!range?.from) return "Tarih Seçin"
        if (!range.to) return format(range.from, "dd MMM yyyy", { locale: tr })
        return `${format(range.from, "dd MMM yyyy", { locale: tr })} — ${format(range.to, "dd MMM yyyy", { locale: tr })}`
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        setDate(undefined)
        onDateChange?.(undefined)
    }

    const handlePresetSelect = (range: DateRange) => {
        setDate(range);
        onDateChange?.(range);
        setIsOpen(false);
    }

    const applyCustomRange = (forceFrom?: string, forceTo?: string) => {
        const parsedFrom = parseDateString(forceFrom || fromVal);
        const parsedTo = parseDateString(forceTo || toVal);

        let finalFrom = parsedFrom;
        let finalTo = parsedTo;

        if (finalFrom && isValid(finalFrom) && finalTo && isValid(finalTo)) {
            if (isBefore(finalTo, finalFrom)) {
                const temp = finalFrom;
                finalFrom = finalTo;
                finalTo = temp;
            }
            const newRange = { from: finalFrom, to: finalTo };
            setDate(newRange);
            onDateChange?.(newRange);
            setIsOpen(false);
        } else if (finalFrom && isValid(finalFrom)) {
            const newRange = { from: finalFrom, to: finalFrom };
            setDate(newRange);
            onDateChange?.(newRange);
            setIsOpen(false);
        }
    };

    const handleFromKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const parsed = parseDateString(fromVal);
            if (parsed && isValid(parsed)) {
                const formatted = format(parsed, "dd.MM.yyyy");
                setFromVal(formatted);
                toInputRef.current?.focus();
            }
        }
    }

    const handleToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const parsedTo = parseDateString(toVal);
            if (parsedTo && isValid(parsedTo)) {
                const formattedTo = format(parsedTo, "dd.MM.yyyy");
                setToVal(formattedTo);

                // İkinci değer Enter'landı, direkt uygula ve kapat
                setTimeout(() => applyCustomRange(fromVal, formattedTo), 10);
            }
        }
    }

    const handleFromBlur = () => {
        if (fromVal) {
            const parsed = parseDateString(fromVal);
            if (parsed && isValid(parsed)) {
                setFromVal(format(parsed, "dd.MM.yyyy"));
            }
        }
    }

    const handleToBlur = () => {
        if (toVal) {
            const parsed = parseDateString(toVal);
            if (parsed && isValid(parsed)) {
                setToVal(format(parsed, "dd.MM.yyyy"));
            }
        }
    }

    const currentMonthYear = format(new Date(), "MM/yyyy");
    const placeholderText = `../${currentMonthYear}`;

    return (
        <div className={cn("grid gap-2", className)} {...props}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[280px] justify-between text-left font-normal bg-gray-900 border-gray-800 text-gray-100 shadow-sm hover:bg-gray-800",
                            !date && "text-gray-400"
                        )}
                        style={{ fontFamily: "Inter, sans-serif" }}
                    >
                        <div className="flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-indigo-400" />
                            <span className="truncate">{formatRange(date)}</span>
                        </div>
                        {date?.from && (
                            <div
                                onClick={handleClear}
                                className="h-5 w-5 rounded-full hover:bg-gray-700 flex items-center justify-center transition-colors shrink-0"
                            >
                                <X className="h-3 w-3 text-gray-400" />
                            </div>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[320px] p-0 border border-gray-800 bg-gray-950/95 backdrop-blur-xl shadow-2xl rounded-xl overflow-hidden"
                    align="start"
                    style={{ fontFamily: "Inter, sans-serif" }}
                >
                    <div className="flex flex-col">
                        {/* PRESETS (Hızlı Seçim) */}
                        <div className="grid grid-cols-2 gap-2 p-4 bg-gray-900/80 border-b border-gray-700">
                            <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 ml-1">
                                Hızlı Seçim
                            </div>
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.label}
                                    onClick={() => handlePresetSelect(preset.getValue())}
                                    className="px-3 py-2.5 text-sm font-medium text-gray-200 rounded-md bg-gray-800 hover:bg-indigo-600 hover:text-white border border-gray-700 hover:border-indigo-500 transition-all text-left truncate shadow-sm"
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        {/* INPUTS (Tarih Aralığı) */}
                        <div className="p-5 flex flex-col gap-4 bg-gray-950/80">
                            <div className="space-y-1.5 focus-within:text-indigo-400 text-gray-300 transition-colors">
                                <label className="text-[11px] font-semibold uppercase tracking-wider pl-1">
                                    Başlangıç
                                </label>
                                <Input
                                    value={fromVal}
                                    onChange={(e) => setFromVal(e.target.value)}
                                    onKeyDown={handleFromKeyDown}
                                    onBlur={handleFromBlur}
                                    onFocus={(e) => e.target.select()}
                                    placeholder={placeholderText}
                                    className="h-11 bg-gray-900 border-gray-700 text-gray-100 font-bold focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg text-sm placeholder:text-gray-600 transition-all text-center tracking-widest shadow-inner shadow-black/20"
                                />
                            </div>
                            <div className="space-y-1.5 focus-within:text-indigo-400 text-gray-300 transition-colors relative">
                                <label className="text-[11px] font-semibold uppercase tracking-wider pl-1">
                                    Bitiş
                                </label>
                                <div className="relative">
                                    <Input
                                        ref={toInputRef}
                                        value={toVal}
                                        onChange={(e) => setToVal(e.target.value)}
                                        onKeyDown={handleToKeyDown}
                                        onBlur={handleToBlur}
                                        onFocus={(e) => e.target.select()}
                                        placeholder={placeholderText}
                                        className="h-11 bg-gray-900 border-gray-700 text-gray-100 font-bold focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg text-sm placeholder:text-gray-600 transition-all text-center tracking-widest pl-8 shadow-inner shadow-black/20"
                                    />
                                    <ArrowRight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
