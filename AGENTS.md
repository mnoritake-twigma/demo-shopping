# Payload Code Layer experiment: initial construction instructions

This file is authored for this repository BEFORE a Figma-managed backend is created. It is not copied from a Make/Payload template.

## Scope and source of truth

- Work only on `codex/payload-code-layer-experiment` or a separately approved experiment branch. Never modify `main` or `codex/demo-baseline-v1`, an existing production DB, or a production API.
- The authoritative baseline is main commit `77ed0e99113634861391563eaec78c7ef95a0422`. Existing DB/API behavior takes priority over generated assumptions. Cite source paths for every claimed business rule; mark anything not confirmed as unknown.
- Read [DB mapping](docs/payload-schema.md), [API contract](docs/api-contract.md), and [experiment plan](docs/payload-experiment-plan.md) before changes. These three documents preserve the business requirements independently of this file.
- Start by reporting the branch/commit, which instruction/specification files you could actually read, and the existing backend status. Do not claim recognition merely because a file is present in GitHub.
- Main already contains NestJS/Prisma AND a self-hosted Payload comparison implementation. `backend/nest/prisma/schema.prisma`, `backend/nest/src/`, and `backend/shared/shop.mjs` define the baseline. `backend/payload/` is reference code, not a ready-made Figma platform configuration. Record whether code was copied or reconstructed; copying is not evidence of independent reconstruction.

## Platform creation and configuration

- During repository preparation only, DO NOT create a Figma backend. In a subsequent explicitly started Figma experiment, if a Figma-managed Payload backend is absent, use the official Add backend flow available in that surface. If it is unavailable in Code Layers, record this as blocked; do not invent an equivalent tool or silently substitute a Make/CLI workflow.
- If Create is needed, show the proposed target and wait for the user's approval before the Create action. Approval to prepare these documents is not approval to create a backend.
- Before any required Vite-to-Next.js/framework migration, explain the affected entry points, routing, environment variables, MSW/mock setup, API client, React/design-system dependencies, build configuration and expected UI impact. Preserve the existing EC behavior and record a before/after file diff.
- After creation, prioritize Figma's generated backend structure and retain `buildFigmaConfig()` and platform-managed integration. Do not replace it with the self-hosted `buildConfig()` configuration in this repository.
- Do not independently recreate or overwrite Figma-managed DB connections, Secrets, authentication configuration or storage configuration. Never copy local `.env`, database dumps, tokens, real users or password hashes into Figma/Git. Do not replace platform admin authentication with the shop-user authentication model. Add business behavior only through supported extension points; if this cannot be done, report the limitation.
- Never assume an undocumented Figma MCP function, Payload tool, Git connector, deployment capability or runtime permission exists. Inspect the available UI/tools and report what was actually used. Platform creation, deployment, Code Layer linkage and API compatibility are separate outcomes.

## Business implementation and validation

- Create Collections from the actual five Prisma models and the field-level mapping in `docs/payload-schema.md`. Preserve external string IDs, optional fields, unique constraints, references and deletion semantics, or explicitly document discrepancies. Platform admin collections are infrastructure, not an invented business entity.
- Preserve the shop API contract, pagination/search/sort, server-side pricing/shipping, stock checks, cookie-based ownership and error behavior. Payload's generated CRUD API alone is not equivalent to the shop API.
- Validate positive AND negative API cases against fixed expected results and an isolated baseline fixture. Never point mutation tests at a production backend. Explain unresolved framework-level differences; do not claim complete equivalence on a happy-path-only test.
- Use only fictional product/category fixtures and newly generated test users/credentials. Seed data explicitly and record the operation. Never copy existing sessions or credentials. Keep test credentials out of Git and screenshots.
- Git sync transfers code; it does not prove Payload schema/data synchronization, seeding or persistence. Test save/read, Code Layer restart and Git sync independently against the SAME managed backend identity.
- Do not add comparison, favorites, contact, coupons, orders or payments as part of this baseline experiment. Their absence is not authorization to implement them.

## Surviving template migration

Before migration, retain these documents and record the source commit. If Figma replaces AGENTS.md, retain the generated platform instructions and merge a reference to all three documents plus these business/safety rules into the new instruction file. Do not overwrite the template wholesale. Re-open the resulting instructions and ask the Agent to cite the source paths and restate ID mapping, cart ownership, price/shipping and approval boundaries. If documents disappear, restore them from the experiment branch before proceeding. Report conflicts instead of silently dropping either platform constraints or business requirements.
