<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


AI Agent instructions — follow project conventions

- Follow existing architecture and make minimal, targeted changes.
- Prefer editing existing files over creating new files.
- Keep components small and reusable.
- Separate UI, business logic, and API logic.
- Use TypeScript strict mode and preserve naming conventions.
- Update documentation when architecture changes.
- Do not commit secrets. Use .env.example for required env vars.

