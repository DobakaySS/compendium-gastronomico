# PRD & System Architecture: Smart Recipe Web App

> **Checkpoint (2026-08-05)** — este documento foi revisado para refletir o
> estado real do sistema. Features marcadas ✅ estão implementadas, 🟡 estão
> parcialmente implementadas e ⛔ ainda não existem. As seções desatualizadas do
> PRD original foram corrigidas.

## 1. Project Overview
A Mobile-First Web Application (PWA) designed for smart recipe management. The core value proposition is dynamic portion scaling, precise macronutrient tracking, localized historical cost analysis, and collaborative culinary evolution. It features version control for recipes (Tabs), shared experiment logs, and AI-powered data entry.

## 2. Tech Stack (current)
- **Frontend/Framework:** Next.js 16 (App Router), React 19, TypeScript. Mobile-First.
- **Styling & UI:** Tailwind CSS v4, Shadcn UI + Base UI (Combobox, Tabs, Sliders, Cards, Modals, Select, Dialog).
- **Forms/Validation:** React Hook Form + Zod.
- **Backend & Auth:** Supabase (PostgreSQL, Supabase Auth, Storage, RLS).
- **AI Integration:** Gemini (model configurable via `GEMINI_MODEL` env) via Server Actions (`src/app/actions/ai-parser.ts`).
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

### `ingredient_prices` (global historical prices by city)
- `id`, `ingredient_id` (FK), `city` (text), `price` (numeric), `currency` (default 'BRL')
- `reference_amount` (numeric, default 100) + `reference_unit` (default 'g') - ✅ price reference basis for cost math
- `recorded_on` (date), `created_at`

### `recipes` (with Versions)
- `id` (uuid, PK)
- `parent_recipe_id` (uuid, FK recipes.id, nullable) - enables the Version/Tab system
- `version_name` (text, nullable) - e.g., "Original", "High Protein", "v2"
- `user_id` (uuid, FK auth.users)
- `title` (text)
- `base_servings`, `prep_time_minutes`, `effort_level` (numeric)
- `instructions` (jsonb), `image_url` (text, nullable), `techniques` (jsonb, nullable)
- `public_token` (text, unique) - schema ready; public sharing not implemented yet

### `recipe_ingredients` & `recipe_authors`
Many-to-many linking ingredients and authors to specific recipe IDs.

### `recipe_logs` (shared logbook)
- `id`, `recipe_id` (FK), `author_id` (FK), `note` (text), `created_at`
- Table + RLS ready; **no UI yet** (⛔).

### `shopping_lists` & `shopping_list_items`
- `shopping_lists`: `id`, `user_id`, `recipe_id` (nullable), `title`, `servings`, `created_at`
- `shopping_list_items`: `id`, `shopping_list_id`, `ingredient_id`, `amount`, `unit`, `checked`

### Roles & RLS
- Roles stored in `auth.users.raw_app_meta_data.role`: `admin`, `colaborador`, `visitante`.
- RLS: **shared collection** — reads for all `authenticated`; writes restricted to `admin`/`colaborador`.
- Admin functions (`SECURITY DEFINER`): `admin_create_user` (admin creates colaborador), `admin_list_users`.
- Storage: public bucket `recipe-images` with authenticated insert/update/delete.

## 4. Features & Implementation Status

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
- ✅ **Pantry Check (Shopping List):** stock input per ingredient; outputs missing items + estimated cost; generates persisted shopping lists with a check-off checklist and delete.
- 🟡 City selector exists (cookie-persisted) and is used by cost display; **price registration UI is missing** (prices must be seeded in the DB).

### Phase 3: Collaborative Logbook & Public Viewer 🟡
- ⛔ `recipe_logs` timeline at the bottom of the recipe page — **not implemented** (table/policies ready).
- ⛔ `/r/[public_token]` read-only public route + **Kitchen Mode wake-lock** — **not implemented**.

### Phase 4: AI Smart Import ✅
- ✅ Recipe text → Gemini JSON extraction (title, servings, time, effort, steps, techniques, ingredients).
- ✅ Per-ingredient macros per 100g + `grams_per_unit` estimation.
- ✅ Fuzzy matching against the catalog; confirmation dialog to resolve unmatched ingredients (select existing or create new with macros/grams).
- ✅ Save creates new ingredients + recipe + links. Implemented as Server Action (`parseRecipeAction`) instead of `/api/parse-recipe`.

### PWA / UX ✅
- ✅ PWA manifest (`/manifest.webmanifest`, standalone, dark theme) + service worker (app-shell caching, network-first for same-origin GET).
- ✅ Mobile-first "quiet luxury" dark design system.
- ✅ App-first navigation: compact top bar (city, Receitas, Compras, Smart Import) + sidebar (Dashboard, Receitas, Ingredientes, Autores, Admin) — persistent on desktop, drawer on mobile.

## 5. Known Gaps / Next Steps (roadmap)

1. ⛔ **Price registration UI** — interface to add/edit `ingredient_prices` by city (currently display-only).
2. ⛔ **Recipe delete** — no user-facing delete for recipes.
3. ⛔ **Recipe logbook** — timeline UI + action to append `recipe_logs` to a recipe.
4. ⛔ **Public sharing** — `/r/[public_token]` read-only route + Kitchen Mode (wake-lock).
5. 🟡 **Unit conversions beyond "unidade"** — `xícara`, `ml`, `l`, `colher` are still treated as grams in macro math.
6. 🟡 **Techniques** — captured by AI import but no manual edit UI / display besides recipe detail.
7. 🟡 **PWA offline-first** — current SW caches GETs opportunistically; no full offline data strategy.

## 6. Conventions
- Route group `(app)` = authenticated shell (header + sidebar); `(auth)` = login/signup; auth routes outside groups.
- Server Components by default; `"use client"` only on interactive leaves.
- All DB mutations via Server Actions; direct Supabase queries in Server Components.
- Design tokens: zinc palette, Playfair Display headings, uppercase micro-labels.
