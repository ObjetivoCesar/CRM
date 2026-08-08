import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#00C2E0] to-[#0090A8] text-white rounded-xl shadow-[0_0_20px_rgba(0,194,224,0.30)] hover:shadow-[0_0_30px_rgba(0,194,224,0.50)] hover:opacity-95",
        destructive:
          "bg-red-500/80 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg border border-red-400/30",
        outline:
          "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white rounded-xl backdrop-blur-md",
        secondary:
          "bg-white/10 hover:bg-white/15 text-[#A8C8E8] hover:text-white rounded-xl backdrop-blur-md",
        ghost:
          "hover:bg-white/10 text-[#A8C8E8] hover:text-white rounded-xl",
        link:
          "text-[#00C2E0] underline-offset-4 hover:underline",
        icon:
          "text-[#A8C8E8] hover:text-white rounded-xl hover:bg-white/10",
      },
      size: {
        default: "h-10 px-5 py-2 rounded-xl",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-7 text-base",
        icon: "h-10 w-10 p-2 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
