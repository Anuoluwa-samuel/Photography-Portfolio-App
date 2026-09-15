import * as React from "react"
import { cn } from "@/lib/utils"

interface FieldBase {
  id: string
  label: string
  /** Icon shown inside the label (it floats with it). */
  icon?: React.ReactNode
  /** Validation message; also marks the control `aria-invalid`. */
  error?: string
  /** Small note after the label, e.g. "optional". */
  hint?: string
  className?: string
}

type InputFieldProps = FieldBase & { as?: "input" } & Omit<React.ComponentProps<"input">, "id" | "className">
type TextareaFieldProps = FieldBase & { as: "textarea" } & Omit<React.ComponentProps<"textarea">, "id" | "className">
type SelectFieldProps = FieldBase & { as: "select" } & Omit<React.ComponentProps<"select">, "id" | "className">

export type FloatingFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps

/** Small autofocus corners that appear while the field has focus. */
function FocusCorners() {
  const corner =
    "absolute size-2 border-brand/80 opacity-0 transition-opacity duration-300 group-focus-within/field:opacity-100 motion-reduce:transition-none"
  return (
    <span aria-hidden="true" className="pointer-events-none absolute -inset-x-2 -bottom-1 top-0">
      <span className={cn(corner, "left-0 top-0 border-l-[1.5px] border-t-[1.5px]")} />
      <span className={cn(corner, "right-0 top-0 border-r-[1.5px] border-t-[1.5px]")} />
      <span className={cn(corner, "bottom-0 left-0 border-b-[1.5px] border-l-[1.5px]")} />
      <span className={cn(corner, "bottom-0 right-0 border-b-[1.5px] border-r-[1.5px]")} />
    </span>
  )
}

/**
 * FloatingField — underline input with a floating, icon-led label, a focus line that sweeps
 * in from the centre, and viewfinder corners while focused. Works as input, textarea or select.
 */
export function FloatingField(props: FloatingFieldProps) {
  const { id, label, icon, error, hint, className, ...control } = props
  const errorId = `${id}-error`
  // Selects and date inputs always show a value/format, so their label stays floated.
  const alwaysFloat = control.as === "select" || (control.as !== "textarea" && (control as InputFieldProps).type === "date")

  const controlClass = cn(
    "peer block w-full appearance-none rounded-none border-0 border-b border-border bg-transparent px-0 pb-2 pt-6 text-[.95rem] font-light text-foreground outline-none",
    "transition-colors duration-300 placeholder:text-transparent aria-[invalid=true]:border-danger/70",
    control.as === "textarea" && "min-h-[128px] resize-y",
    control.as === "select" && "select-arrow cursor-pointer !pr-8 ![background-position:right_2px_center]",
  )
  const shared = { id, "aria-invalid": error ? true : undefined, "aria-describedby": errorId, className: controlClass }

  let element: React.ReactNode
  if (control.as === "textarea") {
    const { as: _as, ...p } = control
    element = <textarea placeholder=" " {...p} {...shared} />
  } else if (control.as === "select") {
    const { as: _as, children, ...p } = control
    element = <select {...p} {...shared}>{children}</select>
  } else {
    const { as: _as, ...p } = control
    element = <input placeholder=" " {...p} {...shared} />
  }

  return (
    <div data-slot="floating-field" className={cn("group/field", className)}>
      <div className="relative">
        {element}
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-0 top-6 flex origin-[0_0] items-center gap-2 font-display text-[.72rem] uppercase tracking-[.18em] text-muted-foreground",
            "transition-[translate,scale,color] duration-300 ease-[var(--ease)] motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0",
            "-translate-y-5 scale-[.88] peer-focus:text-brand peer-aria-[invalid=true]:text-danger",
            !alwaysFloat && "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-5 peer-focus:scale-[.88]",
          )}
        >
          {icon}
          {label}
          {hint && <small className="normal-case tracking-[.04em] text-dim">{hint}</small>}
        </label>
        {/* Focus line sweeps in from the centre */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-brand transition-transform duration-500 ease-[var(--ease)] peer-focus:scale-x-100 peer-aria-[invalid=true]:bg-danger motion-reduce:transition-none"
        />
        <FocusCorners />
      </div>
      <p id={errorId} aria-live="polite" className="mb-2 mt-2 min-h-[1.1em] text-[.76rem] leading-tight text-danger">
        {error}
      </p>
    </div>
  )
}

export default FloatingField
