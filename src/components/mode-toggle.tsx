"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Palette } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"

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
            {/* Icon-only trigger: hide the select's own chevron. */}
            <SelectTrigger
                className="size-10 justify-center px-0 [&>svg:last-child]:hidden"
                aria-label="Theme"
                title="Theme"
            >
                <Palette className="size-5" aria-hidden="true" />
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
