import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:   "border-transparent bg-secondary text-secondary-foreground",
        outline:   "border-border text-foreground bg-transparent",
        primary:   "border-transparent bg-primary text-primary-foreground",
        success:   "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400",
        danger:    "border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400",
        warning:   "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400",
        // Status variants
        "status-new":       "border-sky-200 bg-sky-100 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/15 dark:text-sky-400",
        "status-reviewed":  "border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/15 dark:text-violet-400",
        "status-contacted": "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-400",
        "status-qualified": "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-400",
        "status-discarded": "border-rose-200 bg-rose-100 text-rose-600 dark:border-rose-500/25 dark:bg-rose-500/15 dark:text-rose-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
