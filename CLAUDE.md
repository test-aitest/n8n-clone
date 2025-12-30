# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nodebase Enterprise Edition - A self-hosted workflow automation platform (N8N/Zapier clone) built as a full-stack application. This is an internal tool version with all payment/subscription features removed from the original SaaS template.

**Status:** Greenfield project with specification only (no source code yet). Implementation follows the 10-phase plan in `docs/Nodebase 課金機能なし実装指示書作成.md`.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Package Manager:** pnpm (required)
- **Database:** PostgreSQL (Neon) with Prisma ORM
- **API:** tRPC for type-safe client-server communication
- **Authentication:** Better Auth (not NextAuth)
- **Workflow UI:** React Flow (@xyflow/react)
- **State Management:** Jotai (for editor state)
- **Background Jobs:** Inngest
- **UI Components:** Shadcn UI + Tailwind CSS + Lucide React
- **Linter/Formatter:** Biome (not ESLint)
- **Error Tracking:** Sentry (optional)

## Build Verification Rule

**重要:** 各実装フェーズ終了時に必ず以下を実行：
```bash
pnpm build
```
ビルドエラーと実行エラーがない状態で各フェーズを完了すること。

## Common Commands

```bash
# Development
pnpm dev                    # Start development server (Turbopack)
pnpm build                  # Production build
pnpm start                  # Start production server

# Database
pnpm prisma generate        # Generate Prisma client
pnpm prisma db push         # Push schema to database
pnpm prisma migrate dev     # Create and run migrations
pnpm prisma studio          # Open Prisma Studio

# Code Quality
pnpm lint                   # Run Biome linting
pnpm format                 # Run Biome formatting

# Inngest (local development)
pnpm inngest:dev            # Run Inngest dev server
```

## Project Initialization

When starting from scratch:

```bash
npx create-next-app@16.1.1 . \
  --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --use-pnpm --turbopack

npx shadcn@latest init      # Style: New York, Base Color: Zinc, CSS Variables: yes
```

## Architecture

### Directory Structure (Target)

```
src/
├── app/
│   ├── api/
│   │   ├── trpc/[trpc]/    # tRPC API handler
│   │   └── inngest/        # Background job handlers
│   ├── (dashboard)/        # Protected routes group
│   │   ├── dashboard/
│   │   ├── workflows/
│   │   ├── credentials/
│   │   ├── executions/
│   │   └── settings/
│   └── (auth)/             # Auth routes (sign-in, sign-up)
├── lib/
│   ├── auth.ts             # Better Auth configuration
│   ├── encryption.ts       # AES-256-GCM encryption for credentials
│   ├── env.ts              # Zod environment variable validation
│   └── workflow/sort.ts    # Topological sort for execution order
├── server/
│   ├── trpc.ts             # tRPC context and procedures
│   ├── routers/            # tRPC routers (workflow, credential, execution)
│   └── workflow-engine/
│       └── executors/      # Node-specific execution logic
├── components/
│   ├── workflow-editor/    # React Flow canvas components
│   ├── node-selector/      # Node type picker
│   └── properties-panel/   # Node configuration sidebar
└── features/
    └── editor/
        └── store/atoms.ts  # Jotai atoms for editor state
```

### Key Patterns

1. **tRPC Procedures:** Use `protectedProcedure` for all authenticated endpoints. No `premiumProcedure` exists (SaaS features removed).

2. **Credential Security:** API keys stored encrypted (AES-256-GCM). Never return decrypted values to client.

3. **Workflow Execution:** Uses topological sort (Kahn's algorithm) for dependency resolution. Inngest handles distributed execution with retries.

4. **Variable Templating:** Supports `{{NodeId.output.field}}` syntax for passing data between nodes.

## Environment Variables

Required:

```
DATABASE_URL                 # Neon PostgreSQL connection
BETTER_AUTH_SECRET           # Session encryption (32+ bytes)
BETTER_AUTH_URL              # App root URL
NEXT_PUBLIC_APP_URL          # Public app URL
ENCRYPTION_KEY               # API credential encryption key
GITHUB_CLIENT_ID             # OAuth
GITHUB_CLIENT_SECRET
GOOGLE_CLIENT_ID             # OAuth
GOOGLE_CLIENT_SECRET
INNGEST_EVENT_KEY            # Background jobs
INNGEST_SIGNING_KEY
SENTRY_AUTH_TOKEN            # Error tracking (optional)
```

**Removed (De-SaaS):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `POLAR_ACCESS_TOKEN`

## Implementation Notes

### De-SaaS Requirements

- Remove all Polar Payments and Stripe integration code
- Remove `premiumProcedure` - replace with `protectedProcedure`
- Remove quota/limit checks on workflow creation
- Remove "Upgrade", "Billing", "Plans" UI elements
- Remove subscription-related database fields from User model

### Core Models

- **User/Session/Account:** Better Auth standard models
- **Workflow:** Stores React Flow definition as JSON
- **Credential:** Encrypted API keys with IV for each
- **Execution/ExecutionLog:** Workflow run history and per-node logs

### Node Types

- **Triggers:** Webhook, Manual, Schedule (Cron), Google Form, Stripe
- **Actions:** HTTP Request, AI (OpenAI/Claude/Gemini), Slack, Discord
- **Logic:** Condition (If/Else), Wait

## Reference Documentation

- Full implementation spec: `docs/Nodebase 課金機能なし実装指示書作成.md` (Japanese)
- Original tutorial references: `docs/REFERENCES.md`
- Original source: `/Users/yabetatuki/Downloads/nodebase-main` (reference only)
