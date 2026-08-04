# PRD & System Architecture: Smart Recipe Web App

## 1. Project Overview
A Mobile-First Web Application (PWA) designed for smart recipe management. The core value proposition is dynamic portion scaling, precise macronutrient tracking, localized historical cost analysis, and collaborative culinary evolution. It features version control for recipes (Tabs), shared experiment logs, and AI-powered data entry.

## 2. Tech Stack
- **Frontend/Framework:** Next.js (App Router), React, TypeScript. (Mobile-First).
- **Styling & UI:** Tailwind CSS, Shadcn UI (Combobox, Tabs, Sliders, Cards, Modals).
- **Backend & Auth:** Supabase (PostgreSQL, Supabase Auth, Storage).
- **AI Integration:** Gemini 2.0 Flash API (via Next.js Serverless Routes) for JSON extraction.
- **Deployment:** Vercel (with PWA manifest).

## 3. Database Schema (Supabase Relational)

### `authors` & `ingredients` & `ingredient_prices`
*(Same as previous structures: handles names, macros per 100g, and localized city-based historical prices).*

### `recipes` (Updated for Versions)
- `id` (uuid, PK)
- `parent_recipe_id` (uuid, FK to recipes.id, nullable) - **Enables the Version/Tab system**. If null, it's the main recipe concept.
- `version_name` (text) - e.g., "Original", "High Protein", "Massimo Bottura Version".
- `user_id` (uuid, FK to auth.users)
- `title` (text) - e.g., "Carbonara"
- `base_servings` (numeric)
- `prep_time_minutes` (numeric)
- `effort_level` (numeric) - Scale 1 to 5
- `instructions` (jsonb)
- `image_url` (text, nullable)
- `techniques` (jsonb, nullable)
- `public_token` (text, unique)

### `recipe_ingredients` & `recipe_authors`
*(Same as previous: Many-to-many linking ingredients and authors to specific recipe IDs).*

### `recipe_logs` (The Shared Logbook)
- `id` (uuid, PK)
- `recipe_id` (uuid, FK to recipes.id)
- `author_id` (uuid, FK to authors.id)
- `note` (text) - e.g., "Experimented with less pasta water, emulsification held better."
- `created_at` (timestamp)

## 4. Core Features & Implementation Phases

### Phase 1: Auth, Core CRUD & Base Recipe
- Setup Next.js Web App with Supabase.
- Manual ingredient/author registration.
- Build the manual recipe creator.

### Phase 2: The Versioning Engine & Calculation
- **Tabs UI:** Group recipes by `parent_recipe_id`. Render a single Card with Tabs for each `version_name`.
- **Dynamic Scaling & Macros:** Calculate total macros and costs per city dynamically based on slider input.
- **Pantry Check (Shopping List):** A UI feature where users input existing fridge stock, and the app outputs the remaining missing ingredients and their estimated cost.

### Phase 3: Collaborative Logbook & Public Viewer
- Implement the timeline of `recipe_logs` at the bottom of the recipe page.
- Build the `/r/[public_token]` route for read-only access (with Kitchen Mode wake-lock).

### Phase 4: AI Smart Import
- Build `/api/parse-recipe` using LLM to extract JSON data, handle fuzzy matching of ingredients, and auto-tag culinary techniques.