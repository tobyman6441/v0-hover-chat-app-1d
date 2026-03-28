# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build (TypeScript errors are ignored by config)
npm run lint     # ESLint
npm run start    # Start production server
```

There is no test runner configured.

## Architecture Overview

**Hover Ninja** is a Next.js 16 (App Router) SaaS application that connects roofing companies to the [Hover](https://hover.to) measurement/inspection platform via AI-powered chat and CRM kanban pipelines.

### Core Data Flow

```
User → Next.js App → Supabase (auth + DB) → Hover API (OAuth, jobs, images)
                   ↓
              LLM Providers (OpenAI, Anthropic, Google, Mistral, Groq, DeepSeek)
```

- **Auth**: Supabase Auth; each user belongs to an `org`. Org-level Hover OAuth tokens and encrypted LLM API keys are stored in the `orgs` table.
- **Multi-tenancy**: All data is scoped by `org_id`. RLS is enforced at the DB level; most cross-table queries go through Supabase RPC functions.
- **LLM routing**: The `/api/chat` route uses the Vercel AI SDK (`ai` package) with per-org model/key selection. Keys are stored encrypted in `orgs.llm_api_key_encrypted` — not in env vars.
- **Hover integration**: OAuth tokens per org, fetched and refreshed via `/app/api/auth/hover/`. All Hover API calls go through `/lib/hover-api.ts`. Images are proxied through `/api/hover/image` to avoid CORS.
- **Webhooks**: Hover sends events (e.g. `instant-design-image-created`) to `/api/hover/webhook`. See `/docs/WEBHOOK_SETUP.md` for registration details.

### Directory Map

| Path | Purpose |
|------|---------|
| `/app` | Next.js App Router pages + API routes |
| `/app/api/chat` | LLM streaming endpoint |
| `/app/api/hover/` | Hover OAuth, image proxy, webhook handler |
| `/app/chat/[chatId]` | Main chat UI |
| `/app/sales`, `/production`, `/marketing` | Kanban CRM pipelines |
| `/components/ui` | shadcn/ui primitives (do not edit directly) |
| `/components/chat` | Chat sidebar, message list, input |
| `/components/kanban` | Drag-and-drop pipeline boards (dnd-kit) |
| `/lib/actions/` | Server actions: `chat.ts`, `leads.ts`, `org.ts`, `stages.ts`, `auth.ts` |
| `/lib/hover-api.ts` | Hover API helpers (unauthenticated context; org token passed as param) |
| `/lib/auth-context.tsx` | React Context providing `user`, `org`, `member` to the app |
| `/lib/supabase/` | Supabase client (browser) and server utilities |
| `/supabase/` | SQL migrations and RPC function definitions |
| `/docs/` | Hover API reference, webhook setup, OAuth flow docs |

### Key Tables (Supabase)

- `orgs` – org settings, Hover tokens, encrypted LLM keys, pipeline stage config
- `members` – org membership with roles (`admin`, `member`)
- `chats` / `messages` – chat history per org
- `job_stages` – maps Hover job IDs to pipeline stage per org
- `stages` – configurable kanban stages per org
- `webhook_events` – log of incoming Hover webhook payloads

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
HOVER_CLIENT_ID
HOVER_CLIENT_SECRET
NEXT_PUBLIC_HOVER_REDIRECT_URI   # e.g. https://your-domain.com/api/hover/oauth
HOVER_WEBHOOK_SECRET             # for webhook signature verification
```

LLM API keys are **not** in env vars — they are stored per-org in the database.

### Key Patterns

- **Server Actions** (`"use server"`) in `/lib/actions/` handle DB mutations; call these from client components instead of writing API routes for CRUD.
- **shadcn/ui**: Components live in `/components/ui`. Add new ones via `npx shadcn@latest add <component>`. Do not manually edit generated files there.
- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin. CSS variables for theming are in `app/globals.css`.
- **`next.config.mjs`** sets `ignoreBuildErrors: true` — TypeScript errors won't block builds but should still be fixed.
- **Image proxy**: All Hover image URLs must be routed through `/api/hover/image?url=...` — direct Hover image URLs require auth headers that browsers can't send.
