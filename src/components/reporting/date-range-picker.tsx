"use client"

import * as React from "react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { ErpDateRangePicker } from "@/components/ui/erp-date-range-picker"
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
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: dateRange.customStart,
        to: dateRange.customEnd,
    })

    // Update internal state when props change
    React.useEffect(() => {
        if (dateRange.range === 'custom') {
            setDate({ from: dateRange.customStart, to: dateRange.customEnd })
        }
    }, [dateRange])

    const presets = [
        { label: "Bugün", value: "today", range: { from: new Date(), to: new Date() } },
        { label: "Dün", value: "yesterday", range: { from: subDays(new Date(), 1), to: subDays(new Date(), 1) } },
        { label: "Bu Hafta", value: "thisWeek", range: { from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: new Date() } },
        { label: "Geçen Hafta", value: "lastWeek", range: { from: startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }), to: endOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }) } },
        { label: "Bu Ay", value: "thisMonth", range: { from: startOfMonth(new Date()), to: new Date() } },
        { label: "Geçen Ay", value: "lastMonth", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
        { label: "Son 6 Ay", value: "last6Months", range: { from: startOfMonth(subMonths(new Date(), 6)), to: new Date() } },
        { label: "Bu Yıl", value: "thisYear", range: { from: startOfYear(new Date()), to: new Date() } },
    ]

    const handlePresetSelect = (preset: any) => {
        const { value, range } = preset
        setDate(range)
        onDateRangeChange({
            range: value as DateRangeType,
            customStart: range.from,
            customEnd: range.to
        })
        setOpen(false)
    }

    const handleCalendarSelect = (newDate: DateRange | undefined) => {
        setDate(newDate)
        if (newDate?.from) {
            onDateRangeChange({
                range: "custom",
                customStart: newDate.from,
                customEnd: newDate.to
            })
        } else {
            // cleared
            onDateRangeChange({
                range: "today",
                customStart: undefined,
                customEnd: undefined
            })
        }
    }

    return (
        <div className={className}>
            <ErpDateRangePicker
                date={date}
                onDateChange={handleCalendarSelect}
            />
        </div>
    )
}
