"use client"
import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT"
const DIRS: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"]

interface AnimatedBadgeProps {
  children: React.ReactNode
  className?: string        // inner chip classes (bg, text, etc.)
  wrapperClassName?: string // outer wrapper overrides
  /** Cor da luz que varre a borda — rgba string */
  glowColor?: string
  duration?: number
}

/**
 * Chip com borda de gradiente animado (versão compacta do HoverBorderGradient).
 * A luz varre a borda continuamente em repouso; no hover intensifica.
 */
export function AnimatedBadge({
  children,
  className,
  wrapperClassName,
  glowColor = "rgba(255,255,255,0.9)",
  duration = 2,
}: AnimatedBadgeProps) {
  const [dir, setDir] = useState<Direction>("TOP")
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const iv = setInterval(
      () => setDir((d) => DIRS[(DIRS.indexOf(d) - 1 + 4) % 4]),
      duration * 1000
    )
    return () => clearInterval(iv)
  }, [duration])

  const map: Record<Direction, string> = {
    TOP:    `radial-gradient(22% 55% at 50% 0%,   ${glowColor} 0%, transparent 100%)`,
    LEFT:   `radial-gradient(18% 45% at 0%  50%,  ${glowColor} 0%, transparent 100%)`,
    BOTTOM: `radial-gradient(22% 55% at 50% 100%, ${glowColor} 0%, transparent 100%)`,
    RIGHT:  `radial-gradient(18% 45% at 100% 50%, ${glowColor} 0%, transparent 100%)`,
  }

  const highlight = `radial-gradient(60% 120% at 50% 50%, ${glowColor} 0%, transparent 100%)`

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "relative inline-flex p-px rounded-full overflow-hidden",
        wrapperClassName
      )}
    >
      {/* Animated border layer */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] z-0"
        style={{ filter: "blur(1.5px)" }}
        animate={{ background: hovered ? [map[dir], highlight] : map[dir] }}
        transition={{ ease: "linear", duration: hovered ? 0.3 : duration }}
      />
      {/* Inner chip */}
      <span
        className={cn(
          "relative z-10 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
          className
        )}
      >
        {children}
      </span>
    </span>
  )
}
