import * as React from "react"
import { Aperture, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

const base =
  "group/action relative isolate inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-display font-medium uppercase tracking-[.14em] outline-none " +
  "transition-[transform,background-color,color,border-color,box-shadow] duration-300 ease-[var(--ease)] motion-reduce:transition-none " +
  "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:scale-[.98] disabled:pointer-events-none disabled:opacity-60 aria-busy:pointer-events-none"

const variants = {
  /** Filled brand button — the main call to action. */
  primary:
    "bg-brand text-brand-foreground shadow-[0_10px_30px_-14px_var(--brand-glow)] hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-[0_18px_40px_-14px_var(--brand-glow)]",
  /** Frosted glass surface — secondary actions over imagery or busy backgrounds. */
  glass: "glass text-foreground hover:-translate-y-0.5 hover:border-brand/50 hover:text-brand",
  /** Inline text action (e.g. "Book portraits →"). */
  link: "h-auto rounded-none px-0 text-brand hover:text-brand-hover",
} as const

const sizes = {
  sm: "h-10 px-4 text-[.68rem]",
  md: "h-12 px-6 text-[.74rem]",
  lg: "h-14 px-8 text-[.8rem]",
} as const

interface ActionButtonOwnProps {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  /** Leading icon. */
  icon?: React.ReactNode
  /** Trailing arrow that slides on hover. */
  arrow?: boolean
  /** Shows a spinning aperture and blocks interaction. */
  loading?: boolean
  className?: string
  children?: React.ReactNode
}

export type ActionButtonProps =
  | (ActionButtonOwnProps & Omit<React.ComponentProps<"button">, keyof ActionButtonOwnProps> & { href?: undefined })
  | (ActionButtonOwnProps & Omit<React.ComponentProps<"a">, keyof ActionButtonOwnProps> & { href: string })

/** Autofocus brackets that snap in around the button on hover / keyboard focus. */
function FocusBrackets() {
  const corner =
    "absolute size-2 border-brand opacity-0 transition-[opacity,translate] duration-300 ease-[var(--ease)] motion-reduce:transition-none " +
    "group-hover/action:translate-x-0 group-hover/action:translate-y-0 group-hover/action:opacity-100 " +
    "group-focus-visible/action:translate-x-0 group-focus-visible/action:translate-y-0 group-focus-visible/action:opacity-100"
  return (
    <span aria-hidden="true" className="pointer-events-none absolute -inset-[8px]">
      <span className={cn(corner, "left-0 top-0 -translate-x-2 -translate-y-2 rounded-tl-[4px] border-l-2 border-t-2")} />
      <span className={cn(corner, "right-0 top-0 translate-x-2 -translate-y-2 rounded-tr-[4px] border-r-2 border-t-2")} />
      <span className={cn(corner, "bottom-0 left-0 -translate-x-2 translate-y-2 rounded-bl-[4px] border-b-2 border-l-2")} />
      <span className={cn(corner, "bottom-0 right-0 translate-x-2 translate-y-2 rounded-br-[4px] border-b-2 border-r-2")} />
    </span>
  )
}

/**
 * ActionButton — call-to-action with a photographic feel: autofocus brackets lock on when hovered,
 * a shutter flash fires on press, the arrow slides forward, and loading spins an aperture.
 * Renders an `<a>` when `href` is given, otherwise a `<button>`.
 */
export function ActionButton(props: ActionButtonProps) {
  const { variant = "primary", size = "md", icon, arrow = true, loading = false, className, children, ...rest } = props
  const classes = cn(base, sizes[size], variants[variant], className)
  const framed = variant !== "link"

  const content = (
    <>
      {framed && <FocusBrackets />}
      {framed && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white opacity-0 transition-opacity duration-200 group-active/action:opacity-30 group-active/action:duration-0"
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0">
        {icon}
        {children}
        {loading ? (
          <Aperture aria-hidden="true" className="animate-spin" />
        ) : (
          arrow && <ArrowRight aria-hidden="true" className="transition-transform duration-300 ease-[var(--ease)] group-hover/action:translate-x-1" />
        )}
      </span>
    </>
  )

  if (rest.href !== undefined) {
    const anchor = rest as React.ComponentProps<"a">
    return (
      <a data-slot="action-button" aria-busy={loading || undefined} {...anchor} className={classes}>
        {content}
      </a>
    )
  }

  const { type = "button", ...button } = rest as React.ComponentProps<"button">
  return (
    <button data-slot="action-button" type={type} aria-busy={loading || undefined} {...button} className={classes}>
      {content}
    </button>
  )
}

export default ActionButton
