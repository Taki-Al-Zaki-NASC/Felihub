import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** 40px minimum height on every variant: v1 shipped a 22px "Hire" button —
 *  the most consequential control in the product and the easiest to mis-tap. */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-ink-strong text-canvas hover:opacity-90',
        primary: 'bg-teal text-white hover:bg-teal-deep',
        outline: 'border border-border-strong bg-surface hover:bg-backdrop',
        ghost: 'hover:bg-backdrop hover:text-ink',
        danger: 'bg-danger text-white hover:opacity-90',
        link: 'text-teal-deep underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-[40px] px-4 py-2',
        sm: 'min-h-[36px] rounded px-3 text-xs',
        lg: 'min-h-[44px] px-6',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))}
        ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
