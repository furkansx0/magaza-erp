"use client"

import * as React from "react"
import { format, subDays, startOfWeek, startOfMonth, parse, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { tr } from "date-fns/locale"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { DateRangeType } from "@/actions/settings/store-reporting-actions"

interface DateRangePickerProps {
    dateRange: {
        range: DateRangeType;
        customStart?: Date;
        customEnd?: Date;
    };
    onDateRangeChange: (range: { range: DateRangeType; customStart?: Date; customEnd?: Date }) => void;
    className?: string;
}

export function DateRangePicker({ dateRange, onDateRangeChange, className }: DateRangePickerProps) {
    const [open, setOpen] = React.useState(false)

    const [startInput, setStartInput] = React.useState("")
    const [endInput, setEndInput] = React.useState("")
    const endInputRef = React.useRef<HTMLInputElement>(null)

    // Düğme üzerinde seçili tarihi/aralığı formatlıyarak gösterme
    const getDisplayText = () => {
        if (dateRange.range !== "custom") {
            const preset = presets.find(p => p.value === dateRange.range);
            return preset ? preset.label : "Tarih Seçin";
        }
        if (dateRange.customStart && dateRange.customEnd) {
            return `${format(dateRange.customStart, "dd MMM yyyy", { locale: tr })} - ${format(dateRange.customEnd, "dd MMM yyyy", { locale: tr })}`;
        }
        return "Özel Tarih";
    }

    const presets = [
        { label: "DÜN", value: "yesterday", range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
        { label: "BUGÜN", value: "today", range: { from: new Date(), to: new Date() } },
        { label: "Bu HAFTA", value: "thisWeek", range: { from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() } },
        { label: "BU AY", value: "thisMonth", range: { from: startOfMonth(new Date()), to: new Date() } },
        { label: "SON 30 GÜN", value: "last30Days", range: { from: subDays(new Date(), 30), to: new Date() } },
    ]

    const handlePresetSelect = (preset: any) => {
        const { value, range } = preset
        onDateRangeChange({
            range: value as DateRangeType,
            customStart: range.from,
            customEnd: range.to
        })
        setOpen(false)
    }

    const autocompleteDate = (val: string) => {
        if (!val) return "";
        let parts = val.split(".");
        const today = new Date();
        const currentMonth = format(today, "MM");
        const currentYear = format(today, "yyyy");

        let day = parts[0];
        if (day.length === 1) day = "0" + day; // 5 -> 05

        let month = parts[1] || currentMonth;
        if (month.length === 1) month = "0" + month;

        let year = parts[2] || currentYear;
        if (year.length === 2) year = "20" + year;

        return `${day}.${month}.${year}`;
    }

    const handleApplyCustom = (sStr: string, eStr: string) => {
        if (!sStr || !eStr) return;

        const sDate = parse(sStr, 'dd.MM.yyyy', new Date());
        const eDate = parse(eStr, 'dd.MM.yyyy', new Date());

        if (isValid(sDate) && isValid(eDate)) {
            onDateRangeChange({
                range: "custom",
                customStart: sDate,
                customEnd: eDate
            });
            setOpen(false);
            setStartInput("");
            setEndInput("");
        } else {
            toast.error("Geçersiz tarih formatı. Lütfen kontrol edin.");
        }
    }

    const handleStartKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const autocompleted = autocompleteDate(startInput);
            setStartInput(autocompleted);
            endInputRef.current?.focus();
        }
    }

    const handleEndKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const autocompleted = autocompleteDate(endInput);
            setEndInput(autocompleted);

            const finalStart = startInput.includes(".") ? startInput : autocompleteDate(startInput);
            setStartInput(finalStart);

            handleApplyCustom(finalStart, autocompleted);
        }
    }

    const startInputRef = React.useRef<HTMLInputElement>(null)

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal bg-white shadow-sm hover:bg-gray-50 border-gray-300",
                            !dateRange.range && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {getDisplayText()}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[260px] p-3 rounded-lg shadow-lg border border-slate-300 bg-white"
                    align="end"
                    onOpenAutoFocus={(e) => {
                        e.preventDefault();
                        // setTimeout ensures the popover is fully rendered before focusing
                        setTimeout(() => startInputRef.current?.focus(), 10);
                    }}
                >
                    <div className="flex flex-col space-y-2">
                        {/* PRESENTS */}
                        <div className="flex flex-col gap-1 pb-3 border-b border-gray-100">
                            {presets.map((preset) => (
                                <Button
                                    key={preset.value}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePresetSelect(preset)}
                                    className={cn(
                                        "w-full justify-center font-semibold tracking-wide transition-all h-8 text-xs",
                                        dateRange.range === preset.value
                                            ? "bg-slate-900 text-white border-slate-900 hover:bg-black hover:text-white"
                                            : "border-slate-300 hover:border-slate-800 text-slate-800 bg-white"
                                    )}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>

                        {/* CUSTOM RANGE */}
                        <div className="flex flex-col gap-2 pt-1">
                            <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-md border border-slate-200">
                                <div className="space-y-1">
                                    <Label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1">Tarih Başlangıcı</Label>
                                    <Input
                                        ref={startInputRef}
                                        placeholder="../(ay/yıl)"
                                        className="h-8 text-sm font-semibold text-center border-slate-300 focus-visible:ring-slate-900 focus-visible:ring-offset-0 focus-visible:border-slate-900"
                                        value={startInput}
                                        onChange={(e) => setStartInput(e.target.value)}
                                        onKeyDown={handleStartKeyDown}
                                        onBlur={() => setStartInput(autocompleteDate(startInput))}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1">Tarih Bitişi</Label>
                                    <Input
                                        ref={endInputRef}
                                        placeholder="../(ay/yıl)"
                                        className="h-8 text-sm font-semibold text-center border-slate-300 focus-visible:ring-slate-900 focus-visible:ring-offset-0 focus-visible:border-slate-900"
                                        value={endInput}
                                        onChange={(e) => setEndInput(e.target.value)}
                                        onKeyDown={handleEndKeyDown}
                                        onBlur={() => setEndInput(autocompleteDate(endInput))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
