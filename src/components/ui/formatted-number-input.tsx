"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import React, { useEffect, useState } from "react"

interface FormattedNumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value: number | string | undefined
    onValueChange: (value: number | undefined) => void
}

export function FormattedNumberInput({ value, onValueChange, className, ...props }: FormattedNumberInputProps) {
    const [displayValue, setDisplayValue] = useState("")

    // Initial Sync and External Updates
    useEffect(() => {
        if (value === undefined || value === "") {
            setDisplayValue("")
            return
        }

        // If value changes externally (e.g. reset form), format it
        // Check if current displayValue matches the number value to avoid cursor jumping if we were doing live formatting
        // But here we only sync if the number value is significantly different or checking initial load

        const numVal = typeof value === 'string' ? parseFloat(value) : value
        if (!isNaN(numVal)) {
            // Format as Turkish: 1.234,56
            // Use maximumFractionDigits to keep decimals if present
            const formatted = new Intl.NumberFormat('tr-TR', {
                maximumFractionDigits: 10,
                // ensure we don't add decimals if integer? 
            }).format(numVal)

            // Simple check: If the parsed displayValue equals the new value, don't overwrite user input to avoid cursor jump?
            // But valid string parsing is complex. 
            // Simplest: Always format on external update.
            // But we need to avoid the loop if this useEffect is triggered by parent updating state from OUR onChange.
            // We can achieve this by checking if the parsed version of displayValue === value.

            const currentParsed = parseTurkishNumber(displayValue)
            if (currentParsed !== numVal) {
                setDisplayValue(formatted)
            }
        }
    }, [value])

    const parseTurkishNumber = (val: string) => {
        // Remove thousands separator (.)
        // Replace decimal separator (,) with (.)
        const clean = val.replace(/\./g, "").replace(",", ".")
        return parseFloat(clean)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value

        // Allow digits, comma, dot (convert dot to comma)
        val = val.replace(/\./g, ",")

        // Keep only digits and comma
        val = val.replace(/[^0-9,]/g, "")

        // Ensure max one comma
        const parts = val.split(",")
        if (parts.length > 2) {
            val = parts[0] + "," + parts.slice(1).join("")
        }

        setDisplayValue(val)

        // Calculate numeric value
        if (val === "" || val === ",") {
            onValueChange(undefined)
        } else {
            const num = parseTurkishNumber(val)
            onValueChange(isNaN(num) ? undefined : num)
        }
    }

    const handleBlur = () => {
        if (!displayValue) return

        const num = parseTurkishNumber(displayValue)
        if (!isNaN(num)) {
            // Re-format nicely on blur (e.g. 1000 -> 1.000)
            const formatted = new Intl.NumberFormat('tr-TR', {
                maximumFractionDigits: 2,
                minimumFractionDigits: 0
            }).format(num)
            setDisplayValue(formatted)
        }
    }

    return (
        <Input
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            className={cn("text-right font-mono", className)}
            inputMode="decimal"
            autoComplete="off"
            {...props}
        />
    )
}
