<!-- BEGIN:nextjs-agent-rules -->

# Next.js App Router & React Modern Best Practices

## 1. Architecture & Component Paradigm
- **Strictly App Router:** Use the `app/` directory exclusively. Never use `pages/`.
- **Server Components by Default:** All components must be Server Components unless they require interactivity. 
- **Targeted `"use client"`:** Only add `"use client"` at the very top of files that absolutely need it (e.g., using `useState`, `useEffect`, `onClick`, or Shadcn UI interactive components). Keep Client Components as small, leaf-node components in the tree.

## 2. Data Fetching & Mutations
- **No Internal API Routes for DB:** Do NOT create `app/api/` routes for basic CRUD operations.
- **Server Actions:** Use Next.js Server Actions (e.g., files with `"use server"` at the top, placed in an `app/actions/` folder) for all database mutations and form submissions.
- **Direct Fetching:** Fetch data directly inside Server Components using `await supabase...`.

## 3. Supabase Integration
- **Modern Package:** Strictly use `@supabase/ssr` for authentication and database calls. Do NOT use the deprecated `@supabase/auth-helpers-nextjs`.
- **Client Separation:** Properly instantiate `createBrowserClient` for Client Components and `createServerClient` for Server Components/Actions.

## 4. Styling & UI Components
- **Tailwind & Utility Classes:** Use Tailwind CSS for all styling.
- **Dynamic Classes:** Always use the `cn()` utility function (which combines `clsx` and `tailwind-merge`) when conditionally applying Tailwind classes.
- **Shadcn UI:** Implement Shadcn UI components correctly, adhering strictly to the Dark Mode and "quiet luxury" design system specified previously. 

## 5. Coding Style & Output Execution
- **Complete Output:** Generate complete, testable units of code to support high-intensity iterations. Do not leave placeholder comments like `// implement logic here` or `// add error handling`. Write the actual logic.
- **Strict TypeScript:** Define explicit types and Zod schemas for all database interfaces, forms, and API returns. Avoid `any`.

<!-- END:nextjs-agent-rules -->
