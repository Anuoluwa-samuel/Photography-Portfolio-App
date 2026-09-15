"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface BokehBackgroundProps extends React.ComponentProps<"div"> {
  /** Approximate highlights per 100,000 CSS px² of area (clamped to 8…maxHighlights). */
  density?: number
  /** Upper bound on simultaneous highlights. */
  maxHighlights?: number
  /** Smallest highlight radius in CSS pixels. */
  minRadius?: number
  /** Largest highlight radius in CSS pixels. */
  maxRadius?: number
  /** Aperture blades: 0 renders round bokeh, 5–8 render polygonal bokeh like a stopped-down lens. */
  blades?: number
  /** Drift speed in CSS pixels per second. */
  speed?: number
  /** Overall opacity multiplier (0–1). */
  intensity?: number
  /** 0 = fully out of focus, 1 = crisp edges. Changes animate smoothly, like racking focus. */
  focus?: number
  /** Drift highlights gently toward the pointer (depth-weighted parallax). */
  interactive?: boolean
  /** Any CSS colour for the main highlights. Defaults to the theme's primary colour. */
  color?: string
}

interface Highlight {
  x: number
  y: number
  r: number
  depth: number
  vx: number
  vy: number
  phase: number
  warm: boolean
  rotation: number
}

const MAX_DPR = 2
const TAU = Math.PI * 2

const parseRgb = (css: string): [number, number, number] => {
  const m = css.match(/[\d.]+/g)
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : [31, 209, 193]
}

/**
 * BokehBackground — out-of-focus lens highlights drifting behind content.
 * Canvas 2D, theme-aware (reads the resolved `text-primary` colour and the `dark` class),
 * pauses off-screen and in hidden tabs, and renders a still frame under `prefers-reduced-motion`.
 * Children render on top.
 */
export function BokehBackground({
  density = 3,
  maxHighlights = 44,
  minRadius = 14,
  maxRadius = 78,
  blades = 0,
  speed = 14,
  intensity = 1,
  focus = 0,
  interactive = true,
  color,
  className,
  children,
  ...rest
}: BokehBackgroundProps) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const refreshRef = React.useRef<() => void>(() => {})

  // The render loop reads props through this ref so changes apply live without restarting it.
  const opts = React.useRef({ density, maxHighlights, minRadius, maxRadius, blades, speed, intensity, focus, interactive })
  opts.current = { density, maxHighlights, minRadius, maxRadius, blades, speed, intensity, focus, interactive }

  React.useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!host || !canvas || !ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    let width = 0
    let height = 0
    let raf = 0
    let last = 0
    let visible = true
    let highlights: Highlight[] = []
    let primary: [number, number, number] = [31, 209, 193]
    let dark = false
    let currentFocus = opts.current.focus
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }

    const readTheme = () => {
      primary = parseRgb(getComputedStyle(canvas).color)
      dark = document.documentElement.classList.contains("dark")
    }

    const seed = () => {
      const o = opts.current
      const count = Math.max(8, Math.min(o.maxHighlights, Math.round(((width * height) / 100000) * o.density)))
      highlights = Array.from({ length: count }, () => {
        const depth = Math.random()
        const angle = Math.random() * TAU
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: o.minRadius + (o.maxRadius - o.minRadius) * Math.pow(Math.random(), 1.6),
          depth,
          vx: Math.cos(angle) * (0.4 + depth * 0.6),
          vy: Math.sin(angle) * (0.4 + depth * 0.6) - 0.25, // a slight upward float
          phase: Math.random() * TAU,
          warm: Math.random() < 0.3,
          rotation: Math.random() * TAU,
        }
      })
    }

    const shape = (x: number, y: number, r: number, rotation: number, blades: number) => {
      ctx.beginPath()
      if (blades < 3) {
        ctx.arc(x, y, r, 0, TAU)
        return
      }
      for (let i = 0; i < blades; i++) {
        const a = rotation + (i / blades) * TAU
        if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
        else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      }
      ctx.closePath()
    }

    const draw = (now: number, dt: number) => {
      const o = opts.current
      const t = now / 1000
      currentFocus += (o.focus - currentFocus) * (reduceMotion.matches ? 1 : Math.min(1, dt * 3))
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2)
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2)

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over"

      const k = currentFocus
      const ringStop = 0.55 + 0.4 * k // soft falloff → crisp bright rim as focus increases
      const warm: [number, number, number] = [255, 214, 170]

      for (const h of highlights) {
        if (dt > 0) {
          h.x += h.vx * o.speed * dt
          h.y += h.vy * o.speed * dt
          if (h.x < -h.r) h.x = width + h.r
          else if (h.x > width + h.r) h.x = -h.r
          if (h.y < -h.r) h.y = height + h.r
          else if (h.y > height + h.r) h.y = -h.r
        }

        const px = h.x + pointer.x * (0.2 + h.depth) * 0.04
        const py = h.y + pointer.y * (0.2 + h.depth) * 0.04
        const r = h.r * (1 - 0.18 * k) // highlights tighten a little as they come into focus
        const twinkle = 0.7 + 0.3 * Math.sin(h.phase + t * (0.6 + h.depth))
        const base = (dark ? 0.34 : 0.42) * o.intensity * twinkle * (0.45 + 0.55 * h.depth)
        const [cr, cg, cb] = dark && h.warm ? warm : primary

        const g = ctx.createRadialGradient(px, py, 0, px, py, r)
        g.addColorStop(0, `rgba(${cr},${cg},${cb},${base * 0.5})`)
        g.addColorStop(ringStop, `rgba(${cr},${cg},${cb},${base * (0.5 + 0.5 * k)})`)
        g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
        ctx.fillStyle = g
        shape(px, py, r, h.rotation, o.blades)
        ctx.fill()
      }
      ctx.globalCompositeOperation = "source-over"
    }

    const resize = () => {
      const rect = host.getBoundingClientRect()
      const prevArea = width * height
      width = Math.max(1, Math.round(rect.width))
      height = Math.max(1, Math.round(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!highlights.length || Math.abs(width * height - prevArea) > prevArea * 0.25) seed()
      draw(performance.now(), 0)
    }

    const tick = (now: number) => {
      raf = 0
      if (!visible || document.hidden) return
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      if (reduceMotion.matches) {
        draw(now, 0)
        return
      }
      draw(now, dt)
      raf = requestAnimationFrame(tick)
    }

    const wake = () => {
      if (raf) return
      last = 0
      raf = requestAnimationFrame(tick)
    }

    refreshRef.current = () => {
      readTheme()
      if (reduceMotion.matches) draw(performance.now(), 0)
      else wake()
    }

    const onPointer = (e: PointerEvent) => {
      if (!opts.current.interactive || reduceMotion.matches) return
      const rect = host.getBoundingClientRect()
      pointer.tx = e.clientX - rect.left - rect.width / 2
      pointer.ty = e.clientY - rect.top - rect.height / 2
    }
    const onVisibility = () => {
      if (!document.hidden) wake()
    }

    const ro = new ResizeObserver(resize)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true
      if (visible) wake()
    })
    const mo = new MutationObserver(() => refreshRef.current())

    readTheme()
    resize()
    ro.observe(host)
    io.observe(host)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] })
    window.addEventListener("pointermove", onPointer, { passive: true })
    document.addEventListener("visibilitychange", onVisibility)
    reduceMotion.addEventListener("change", wake)
    wake()

    return () => {
      ro.disconnect()
      io.disconnect()
      mo.disconnect()
      window.removeEventListener("pointermove", onPointer)
      document.removeEventListener("visibilitychange", onVisibility)
      reduceMotion.removeEventListener("change", wake)
      cancelAnimationFrame(raf)
      refreshRef.current = () => {}
    }
  }, [])

  // Prop changes while paused (reduced motion, off-screen) still repaint.
  React.useEffect(() => {
    refreshRef.current()
  }, [density, maxHighlights, minRadius, maxRadius, blades, speed, intensity, focus, interactive, color])

  return (
    <div ref={hostRef} data-slot="bokeh-background" className={cn("relative isolate overflow-hidden", className)} {...rest}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="text-primary pointer-events-none absolute inset-0 -z-10 size-full [mask-image:radial-gradient(ellipse_at_center,#000_55%,transparent_100%)]"
        style={color ? { color } : undefined}
      />
      {children}
    </div>
  )
}

export default BokehBackground
