<!--
Sync Impact Report
Version change: 1.0.0 → 2.0.0
Rationale: Full replacement (MAJOR) — the project pivots away from the previous Music Context
product entirely. Every principle, the technology stack, and the data-source list from v1.0.0
are removed and redefined around a different, unrelated architecture.

Modified principles (all replaced, no 1:1 mapping to v1.0.0):
  - Removed: I. Test-First & Mandatory Coverage (v1.0.0 wording) → replaced by V. Test-First &
    Mandatory Coverage (new wording, co-located tests + mocking convention)
  - Removed: II. Serena-First Code Intelligence (v1.0.0) → carried forward, restated as
    VI. Serena-First Code Intelligence (unchanged intent)
  - Removed: III. Grounded AI Generation (Spotify/MusicBrainz/etc.-specific) → replaced by
    IV. Disciplined AI Integration via Groq (provider and constraints changed)
  - Removed: IV. External API & License Compliance (music-data-provider specific) → dropped;
    no equivalent external-provider principle in this stack
  - Removed: V. Fixed Persistence, Flexible Delivery Stack (PostgreSQL / React or React Native /
    Java or Node.js) → replaced by I. Unified Next.js App Router Stack and
    II. Supabase as the Backend Platform (single fixed stack, no delivery-option flexibility)
  - Added: III. Server Actions for All Mutations
  - Added: VII. Observability & Security Rails

Added sections:
  - Technology Stack & Design System (replaces "Technology Stack & Data Sources")
  - Development Workflow (rewritten for the new stack)
Removed sections: none at the heading level (structure preserved; all content replaced)

Follow-up TODOs:
  - Product name and functional scope are intentionally undefined per user instruction
    ("funcionalidades eu ainda não defini") — to be established via the next `/speckit-specify`.
  - `specs/001-music-context-discovery/` (spec, plan, tasks, etc.) now documents a feature built
    under the retired v1.0.0 constitution and is inconsistent with this stack; left untouched per
    this command's scope (constitution-only) — flagged for the user to archive or delete
    separately.
-->

# MusicMachine Constitution

## Core Principles

### I. Unified Next.js App Router Stack
The application MUST be built as a single Next.js project using the App Router, with React and
TypeScript, styled with Tailwind CSS. There is no separate backend service: server-side logic
lives inside the same Next.js project (Server Components, Server Actions, and Route Handlers
only where a Server Action cannot apply, e.g., OAuth callbacks). Frontend code MUST NOT call any
external provider or the database directly — it goes through Server Actions or Route Handlers.

Rationale: a single deployable unit with one language and one framework minimizes operational
and cognitive overhead for a small team, and matches the architecture already proven in this
organization's reference application.

### II. Supabase as the Backend Platform
Supabase MUST be the sole database and authentication platform: PostgreSQL for data, Supabase
Auth for sign-in (Google OAuth as the baseline provider). Row-Level Security (RLS) MUST be
enabled on every table that stores user data, and every query MUST be scoped to the
authenticated `user_id` — cross-user reads or writes are prohibited. The service-role
("admin") Supabase client MUST NEVER be imported into browser-reachable code.

Rationale: RLS enforced at the database layer is the last line of defense against data leaking
across users even if an application-layer check is missed; keeping the service-role key
server-only prevents it from ever reaching the client bundle.

### III. Server Actions for All Mutations
All data mutations (create, update, delete) MUST be implemented as Server Actions in a
dedicated `actions/` module, not as ad-hoc client-side fetches or inline API routes. Route
Handlers are reserved for cases a Server Action cannot cover (external callbacks such as OAuth,
webhooks). Every Server Action that is costly or abusable (e.g., triggers an AI call or a bulk
import) MUST enforce a rate limit scoped to the authenticated user.

Rationale: centralizing mutations in one reviewable module keeps authorization, validation, and
rate-limiting consistent, and mirrors the pattern already validated in the reference app.

### IV. Disciplined AI Integration via Groq
Any AI/LLM feature MUST go through the Groq API behind a single wrapped client with a fallback
strategy, never called ad-hoc from multiple places. Prompts MUST constrain the model to return a
specific structured format (e.g., a defined JSON shape), and the response MUST be parsed
defensively (the model may wrap output in prose). User-supplied content passed to the model MUST
be truncated to a safe, fixed maximum length before the call.

Rationale: a single integration point makes prompt changes, fallback behavior, and cost control
auditable in one place, and defensive parsing avoids brittle failures when the model doesn't
return pure JSON.

### V. Test-First & Mandatory Coverage (NON-NEGOTIABLE)
Every unit of functionality created or modified MUST ship with automated tests, co-located with
their source file (e.g., `lib/x.ts` ships with `lib/x.test.ts`), run via Vitest. External
services (Supabase, the Groq client, Next.js navigation/cache) MUST be mocked in tests rather
than hit for real. Test coverage MUST be tracked and MUST NOT regress below 80%.

Rationale: co-located tests keep coverage visible file-by-file, and mocking external services
keeps the suite fast and deterministic, matching the convention already in use.

### VI. Serena-First Code Intelligence
All code search, symbol lookup, reference finding, and definition navigation in this repository
MUST use the Serena MCP tools rather than generic text search (grep/ripgrep). Generic text
search is reserved only for content Serena cannot resolve (non-code prose, config values).

Rationale: symbol-aware navigation stays accurate as the codebase grows and avoids false
positives/negatives from plain-text search.

### VII. Observability & Security Rails
Error monitoring (Sentry, or an equivalent agreed replacement) MUST be wired at the server, edge,
and client layers before a feature ships to users. Secrets and API keys MUST NEVER be committed
to the repository or exposed to the browser bundle; every new required environment variable MUST
be documented in the project's environment-variable reference. Any endpoint or Server Action that
accepts file uploads or large payloads MUST enforce an explicit size limit.

Rationale: production issues in a small team are only diagnosable if they are captured
automatically, and credential/payload discipline prevents the most common classes of incident.

## Technology Stack & Design System

- **Framework**: Next.js (App Router), React, TypeScript.
- **Styling**: Tailwind CSS, using a shadcn/ui-based component set (`components.json`-driven) as
  the design system foundation — new UI MUST reuse or extend shadcn/ui primitives rather than
  introducing a second component library.
- **Icons**: `lucide-react` as the single icon set.
- **Notifications/toasts**: `sonner` as the single toast/notification mechanism.
- **Backend/Auth/DB**: Supabase (PostgreSQL + Auth, Google OAuth baseline).
- **AI**: Groq API (model choice may evolve; the integration discipline in Principle IV is what's
  fixed, not a specific model name).
- **Observability**: Sentry (server, edge, and client instrumentation).
- **Testing**: Vitest, with `@vitest/coverage-v8` for coverage reporting.
- **Optional utility toolkit carried over from the reference architecture** (adopt only if the
  eventual functionality needs it, per Principle III's Server Action / client-parsing split):
  `pdfjs-dist` for client-side PDF parsing, `xlsx` for spreadsheet import/export.
- Responsive navigation baseline: a sidebar for tablet/desktop and a bottom navigation bar for
  mobile is the default shell pattern unless a specific feature's spec calls for something else.

Functional scope (which screens, entities, and features this product actually has) is
intentionally **not defined here** — it is out of scope for this constitution and will be
established through `/speckit-specify` for each feature.

## Development Workflow

- Code exploration and navigation tasks MUST go through Serena MCP tools, per Principle VI.
- Every implementation task MUST have a corresponding test task, co-located with its source file,
  per Principle V; a feature is not "done" until its tests exist, pass, and coverage holds at or
  above 80%.
- `npm run lint` MUST pass with no errors before a change is committed.
- Any new or modified Supabase table MUST be reviewed for RLS policy correctness before merge,
  per Principle II.
- Any new Server Action that is AI-backed or otherwise expensive/abusable MUST have its rate
  limit reviewed before merge, per Principle III.
- Do not add code comments or emojis to source files.

## Governance

This constitution supersedes ad hoc practices for this project. Amendments require: (1) a
documented rationale for the change, (2) an updated Sync Impact Report at the top of this file,
and (3) a version bump following semantic versioning — MAJOR for backward-incompatible principle
removals/redefinitions, MINOR for new principles or materially expanded guidance, PATCH for
clarifications and wording fixes. All code reviews MUST verify compliance with these principles
(stack consistency, RLS correctness, Server Action rate-limiting, test coverage, Serena-first
navigation, observability wiring).

**Version**: 2.0.0 | **Ratified**: 2026-08-12 | **Last Amended**: 2026-08-12
