"use client"

import * as React from "react"
import { useTheme } from "next-themes"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const THEMES = [
  { id: "mono-light", label: "Mono Light" },
  { id: "mono-dark", label: "Mono Dark" },
  { id: "neon-light", label: "Neon Light" },
  { id: "neon-dark", label: "Neon Dark" },
] as const

export function ModeToggle() {
    const [mounted, setMounted] = React.useState(false)
    const { theme, setTheme } = useTheme()

    React.useEffect(() => setMounted(true), [])

    if (!mounted) return null

    return (
        <Select value={theme} onValueChange={setTheme}>
            <SelectTrigger className="w-36" aria-label="Theme">
                <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
                {THEMES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                        {t.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
