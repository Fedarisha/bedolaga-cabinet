import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none',
  ],
  {
    variants: {
      variant: {
        // «Салфетка»: чернила с жёлтой тенью маркера
        primary: [
          'bg-accent-500 text-on-accent',
          'shadow-[3px_3px_0_rgb(var(--napkin-marker))]',
          'hover:shadow-[5px_5px_0_rgb(var(--napkin-marker))]',
          'active:bg-accent-600 active:shadow-[1px_1px_0_rgb(var(--napkin-marker))]',
        ],
        // Обводка чернилами
        secondary: [
          'bg-transparent text-accent-500',
          'border-2 border-accent-500',
          'hover:shadow-[3px_3px_0_rgb(var(--napkin-marker-soft))]',
          'active:bg-accent-50',
        ],
        ghost: ['text-dark-300', 'hover:text-dark-100 hover:bg-dark-800/50', 'active:bg-dark-800'],
        destructive: [
          'bg-error-500/10 text-error-400',
          'border border-error-500/20',
          'hover:bg-error-500/20 hover:border-error-500/30',
          'active:bg-error-500/30',
        ],
        outline: [
          'border border-dark-700/50 text-dark-200',
          'hover:bg-dark-800/50 hover:border-dark-600/50 hover:text-dark-100',
          'active:bg-dark-800',
        ],
        link: [
          'text-accent-400',
          'hover:text-accent-300 hover:underline',
          'active:text-accent-500',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-linear',
        md: 'h-10 px-4 text-sm rounded-linear',
        lg: 'h-12 px-6 text-base rounded-linear-lg',
        icon: 'h-10 w-10 rounded-linear',
        'icon-sm': 'h-8 w-8 rounded-linear',
        'icon-lg': 'h-12 w-12 rounded-linear-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
