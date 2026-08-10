# Design Guidelines: Venture

1. **Mobile-First**: All UI is designed for mobile screens first. Use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`) only to adapt for larger screens; the default layout and interaction model must feel like a native mobile app.
2. **Modern & Simple**: Aim for a clean, minimal, modern aesthetic. Keep it simple and uncluttered — avoid gratuitous decoration, but the app should not look like a basic MVP.
3. **shadcn/ui**: Build all UI from shadcn/ui components (Button, Card, Dialog, Input, Sheet, etc.) and their Radix primitives rather than hand-rolling custom equivalents. Follow shadcn/ui design principles.
4. **Design Tokens**: Style exclusively with Tailwind CSS using the project's CSS variable theme tokens (light/dark), e.g. `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border`. Avoid inline styles and arbitrary color literals.
5. **Consistency**: Use shadcn/ui conventions for spacing, radii, and typography. Keep components small, focused, and reusable.
6. **Polish**: Use subtle micro-animations and smooth transitions (e.g. `motion`, `tw-animate-css`) for interactive elements.
