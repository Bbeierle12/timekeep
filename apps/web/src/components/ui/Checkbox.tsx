"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"
import { Label } from "./label"

import { cn } from "@/lib/utils"

const CheckboxBase = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
CheckboxBase.displayName = CheckboxPrimitive.Root.displayName

// Backward compatible Checkbox with label prop and native input compatibility
interface LegacyCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode
}

const Checkbox = React.forwardRef<HTMLInputElement, LegacyCheckboxProps>(
  ({ label, className, id, checked, onChange, ...props }, ref) => {
    const checkboxId = id || React.useId()

    // Handle native input onChange to Radix onCheckedChange
    const handleCheckedChange = (checkedState: boolean) => {
      if (onChange) {
        const syntheticEvent = {
          target: { checked: checkedState },
          currentTarget: { checked: checkedState },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(syntheticEvent)
      }
    }

    if (!label) {
      return (
        <CheckboxBase
          id={checkboxId}
          checked={checked}
          onCheckedChange={handleCheckedChange}
          className={className}
          {...(props as any)}
        />
      )
    }

    return (
      <div className="flex items-center gap-2">
        <CheckboxBase
          id={checkboxId}
          checked={checked}
          onCheckedChange={handleCheckedChange}
          className={className}
          {...(props as any)}
        />
        <Label htmlFor={checkboxId} className="text-sm text-foreground cursor-pointer">
          {label}
        </Label>
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox, CheckboxBase }
export default Checkbox
