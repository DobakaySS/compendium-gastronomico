# PRD & System Architecture: Smart Recipe Web App

> **Checkpoint (2026-08-05)** — este documento foi revisado para refletir o
> estado real do sistema. Features marcadas ✅ estão implementadas, 🟡 estão
> parcialmente implementadas e ⛔ ainda não existem. As seções desatualizadas do
> PRD original foram corrigidas.

## 1. Project Overview
A Mobile-First Web Application (PWA) designed for smart recipe management. The core value proposition is dynamic portion scaling, precise macronutrient tracking, localized historical cost analysis, and collaborative culinary evolution. It features version control for recipes (Tabs), shared experiment logs (per-version), and AI-powered data entry. **Implemented:** city-based price registration with missing-price warnings, and a per-version collaborative logbook with per-user edit/delete.

## 2. Tech Stack (current)
- **Frontend/Framework:** Next.js 16 (App Router), React 19, TypeScript. Mobile-First.
- **Styling & UI:** Tailwind CSS v4, Shadcn UI + Base UI (Combobox, Tabs, Sliders, Cards, Modals, Select, Dialog).
- **Forms/Validation:** React Hook Form + Zod.
- **Backend & Auth:** Supabase (PostgreSQL, Supabase Auth, Storage, RLS).
- **AI Integration:** Gemini (model configurable via `GEMINI_MODEL` env) via Server Actions (`src/app/actions/ai-parser.ts`).
- **Dates:** dayjs + `Intl.DateTimeFormat` (pt-BR).
- **Deployment:** Vercel (with PWA manifest + service worker).
- **Data mutation pattern:** Server Actions (`"use server"` in `src/app/actions/`). No internal API routes for DB CRUD.

## 3. Database Schema (Supabase Relational)

### `ingredients` (global catalog, shared)
- `id` (uuid, PK)
- `name` (text)
- `default_unit` (text, nullable)
- `grams_per_unit` (numeric, nullable) - ✅ **NEW:** average grams per unit; required when `default_unit = 'unidade'` (converts units → grams in macro math).
- `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` (numeric, nullable)

### `authors`
- `id` (uuid, PK), `name` (text), `user_id` (uuid, FK auth.users)

### `ingredient_prices` (global historical prices by city) ✅ fully used
- `id`, `ingredient_id` (FK), `city` (text), `price` (numeric), `currency` (default 'BRL')
- `reference_amount` (numeric, default 100) + `reference_unit` (default 'g') — price reference basis for cost math
- `recorded_on` (date), `created_at`
- RLS: SELECT all authenticated; INSERT/UPDATE/DELETE admin/colaborador.

### `recipes` (with Versions)
- `id` (uuid, PK)
- `parent_recipe_id` (uuid, FK recipes.id, nullable) - enables the Version/Tab system
- `version_name` (text, nullable) - e.g., "Original", "High Protein", "v2"
- `user_id` (uuid, FK auth.users)
- `title` (text)
- `base_servings`, `prep_time_minutes`, `effort_level` (numeric)
- `instructions` (jsonb), `image_url` (text, nullable), `techniques` (jsonb, nullable)
- `public_token` (text, unique) - schema ready; **public sharing not implemented yet** (⛔)

### `recipe_ingredients` & `recipe_authors`
Many-to-many linking ingredients and authors to specific recipe IDs.

### `recipe_logs` (shared logbook) ✅ implemented
- `id`, `recipe_id` (FK), `author_id` (FK authors), `user_id` (FK auth.users) - the auth user who created the entry
- `note` (text), `created_at`
- RLS (migration `0010_recipe_logs_user_id`): SELECT all authenticated; INSERT admin/colaborador with `user_id = auth.uid()`; UPDATE/DELETE by **owner** (`user_id`) **or** admin/colaborador.

### `shopping_lists` & `shopping_list_items`
- `shopping_lists`: `id`, `user_id`, `recipe_id` (nullable), `title`, `servings`, `created_at`
- `shopping_list_items`: `id`, `shopping_list_id`, `ingredient_id`, `amount`, `unit`, `checked`

### `tags` & `recipe_tags` (shared catalog) ✅ implemented
- `tags`: `id` (uuid PK), `name` (text, unique case-insensitive), `color` (text, default '#71717a'), `created_at` — shared across all recipes.
- `recipe_tags`: composite PK `(recipe_id, tag_id)`, both FK with cascade; tags are bound per recipe version row.
- RLS: `tags` select/insert for all authenticated; `recipe_tags` select for all authenticated, insert/update/delete for admin/colaborador (migration `0013_recipe_tags_rls_role`).

### Roles & RLS
- Roles stored in `auth.users.raw_app_meta_data.role`: `admin`, `colaborador`, `visitante`.
- RLS: **shared collection** — reads for all `authenticated`; writes restricted to `admin`/`colaborador`. Exceptions: `recipe_logs` (owner + admin/colaborador on update/delete) and `shopping_lists`/`shopping_list_items` (owner-only).
- Admin functions (`SECURITY DEFINER`): `admin_create_user` (admin creates colaborador), `admin_list_users`.
- Storage: public bucket `recipe-images` with authenticated insert/update/delete.

## 4. Features & Implementation Status

### Current App Routes
- `(app)` shell (header + sidebar): `/` (home), `/dashboard`, `/ingredients` (+ `/ingredients/[id]` detail w/ price history, `/ingredients/new`, `/ingredients/[id]/edit`), `/authors/new`, `/recipes/new`, `/recipes/[id]/edit`, `/recipes/smart-import`, `/r/[id]` (public recipe viewer), `/shopping` + `/shopping/[id]`, `/admin/users`.
- `(auth)` and auth routes: `/login`, `/auth/callback`, `/auth/update-password`.

### Phase 1: Auth, Core CRUD & Base Recipe ✅
- ✅ Email/password auth (login, signup, forgot/reset password, update password).
- ✅ Anonymous visitor sessions (`signInAnon`) with read-only access.
- ✅ Roles admin/colaborador/visitante + shared-collection RLS.
- ✅ Manual ingredient registration + edit + global catalog (`grams_per_unit` included).
- ✅ Author registration (per-user).
- ✅ Manual recipe creator (title, image, servings, prep time, effort 1–5, steps, ingredients, authors).
- ✅ Recipe image upload to Supabase Storage.
- ✅ Admin: create collaborator accounts + list users.

### Phase 2: The Versioning Engine & Calculation ✅
- ✅ **Version/Tab system:** recipes grouped by `parent_recipe_id`; tabs in the viewer, `version_name` auto-naming (`vN`) or custom names; "Corrigir" (in-place edit) and "Nova versão" (branch) save modes.
- ✅ **Dynamic scaling & macros:** ServingSlider scales ingredient amounts by ratio; macro panel computes kcal/protein/carbs/fat dynamically.
- ✅ **Unit→grams conversion** for `unidade` ingredients (via `grams_per_unit`); missing values flagged with an in-viewer warning (macros count 0g).
- ✅ **Cost per city:** reads `ingredient_prices` (latest per city) and computes total cost + cost per serving (currency-aware).
- ✅ **Price registration UI** — at `/ingredients/[id]` (admin/colaborador only): city Select, price, reference amount + unit (g/kg/ml/L), auto today date; history list ordered by `recorded_on` desc. Server action `logPrice` validates with `PriceLogSchema` and revalidates the page.
- ✅ **City selection** — `CityProvider`/`CitySelector` persists the chosen city in a cookie (`cg_city`); recipe viewer shows a city badge ("Preços em {city}") and an amber warning listing ingredients without a registered price for that city.
- ✅ **Pantry Check (Shopping List):** stock input per ingredient; outputs missing items + estimated cost; generates persisted shopping lists with a check-off checklist and delete.

### Phase 3: Collaborative Logbook & Public Viewer 🟡
- ✅ **Recipe Logbook ("Caderno de experimentos")** — per-recipe-version editorial timeline at the bottom of the recipe page (vertical line + dots). Add entries via Dialog (author Select + note Textarea); toast on success; stays open for consecutive entries. **Per-version isolation:** logs are grouped by `recipe_id`; switching versions shows that version's logbook, and new notes are bound to the active version.
- ✅ **Edit & delete entries** — each entry has pencil/trash actions (visible to the owner or admin/colaborador). Edit opens a Dialog with the note pre-filled; delete asks for confirmation. Enforcement is done server-side + RLS (`user_id` ownership).
- ⛔ **Public sharing via `/r/[public_token]` + Kitchen Mode (wake-lock)** — not implemented. Note: `/r/[id]` is already a public read-only route by **recipe ID** (no auth guard, no token, no wake-lock).

### Phase 4: AI Smart Import ✅
- ✅ Recipe text → Gemini JSON extraction (title, servings, time, effort, steps, techniques, ingredients, tags).
- ✅ Per-ingredient macros per 100g + `grams_per_unit` estimation.
- ✅ Fuzzy matching against the catalog; confirmation dialog to resolve ingredients (select existing or create new with macros/grams).
- ✅ **Full edit before save** — the confirmation dialog lets the user edit *everything*: all ingredients (even matched ones can be re-matched, switched to "create new", or have amount/unit edited), recipe metadata (title, servings, time, effort, techniques add/remove, tags toggle), and instructions (edit/add/remove steps). Save only proceeds after client-side validation.
- ✅ Tags: catalog of shared tags (`tags` + `recipe_tags`), colored badges on cards and recipe viewer, inline tag creation in the builder, per-version tags, and tags resolved/created by name during smart import.
- ✅ Save creates new ingredients + recipe + links. Implemented as Server Action (`parseRecipeAction`) instead of `/api/parse-recipe`.

### PWA / UX ✅
- ✅ PWA manifest (`/manifest.webmanifest`, standalone, dark theme) + service worker (app-shell caching, network-first for same-origin GET).
- ✅ Mobile-first "quiet luxury" dark design system.
- ✅ App-first navigation: compact top bar (city, Receitas, Compras, Smart Import) + sidebar (Dashboard, Receitas, Ingredientes, Autores, Admin) — persistent on desktop, drawer on mobile.

## 5. Known Gaps / Next Steps (roadmap)

1. ⛔ **Recipe delete** — no user-facing delete for recipes.
2. ⛔ **Public sharing / Kitchen Mode** — `/r/[public_token]` read-only route + wake-lock. `/r/[id]` is already public by ID, but token-based sharing is not wired.
3. ⛔ **Purchase unit / "unidade comprada"** — requested feature: ingredients sold in fixed packages (e.g., nata sold only in 300g packs) so the shopping list can round quantities up to a purchasable amount (and cost accordingly). Not implemented.
4. 🟡 **Unit conversions beyond "unidade"** — `xícara`, `ml`, `l`, `colher` are still treated as grams in macro math.
5. 🟡 **Techniques** — captured by AI import and shown in the import preview, but no display on the recipe page nor a manual edit UI.
6. 🟡 **PWA offline-first** — current SW caches GETs opportunistically; no full offline data strategy.

## 6. Conventions
- Route group `(app)` = authenticated shell (header + sidebar); `(auth)` = login/signup; auth routes outside groups.
- Server Components by default; `"use client"` only on interactive leaves.
- All DB mutations via Server Actions; direct Supabase queries in Server Components.
- Design tokens: zinc palette, Playfair Display headings, uppercase micro-labels.
