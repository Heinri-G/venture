<!-- BEGIN:vite-agent-rules -->

# This is a Vite + Netlify project

This workspace uses Vite for the frontend and Netlify for hosting and serverless functions. Refer to Vite docs under `node_modules/vite/` and Netlify docs when modifying build, dev server, or function behavior. Update agent rules and tooling to match Vite conventions rather than Next.js-specific APIs.

<!-- END:vite-agent-rules -->


AI Agent instructions — follow project conventions

- READ `.agents/rules/*.md` (design_guidelines.md, security.md, tech_stack.md) before starting any work and follow them for all changes.
- Follow existing architecture and make minimal, targeted changes.
- Prefer editing existing files over creating new files.
- Keep components small and reusable.
- Use shadcn/ui components and follow their design principles for all new UI work.
- Build UI from shadcn/ui primitives (e.g. Button, Card, Dialog, Input) and Radix-ui building blocks rather than hand-rolling custom equivalents.
- Respect shadcn/ui conventions: Tailwind CSS for styling, CSS variables for theme tokens (light/dark), and consistent spacing, radii, and typography.
- Keep any custom styling consistent with shadcn/ui token usage; avoid inline styles and arbitrary color literals.
- Separate UI, business logic, and API logic.
- Use TypeScript strict mode and preserve naming conventions.
- Update documentation when architecture changes.
- Do not commit secrets. Use .env.example for required env vars.

