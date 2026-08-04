# UI/UX Design System Instructions

You must strictly follow this visual identity for all components. The app must have a highly elegant, "quiet luxury", and editorial magazine aesthetic (Dark Mode Only). Reference the design style of high-end culinary publications.

## 1. Color Palette & Backgrounds
- The app is strictly Dark Mode. Do not implement light mode.
- App Background: Use `bg-zinc-950` or `#121212`. Do NOT use pure pitch black.
- Primary Text: Use `text-zinc-100` for high contrast readability.
- Secondary Text (Subtitles, small text, bio): Use `text-zinc-400` or `text-zinc-500`.
- Borders/Dividers: Use subtle lines like `border-zinc-800`.

## 2. Typography (Crucial for the Aesthetic)
- Import fonts using `next/font/google`.
- **Headings (Logo, Recipe Titles, Section Headers):** Use a classic Serif font (e.g., `Playfair Display` or `Merriweather`). Use this for h1, h2, and brand name.
- **Body & UI Elements:** Use a clean, highly readable Sans-serif font (e.g., `Inter` or `Geist`).
- Use uppercase with wide letter-spacing (`uppercase tracking-wider text-xs`) for small section labels (e.g., "DESCRIPTION", "INGREDIENTS", author names).

## 3. Component Styling Rules

### Home/Dashboard (Recipe Cards)
- Cards must use a full-bleed background image. 
- Apply a dark gradient overlay at the bottom of the card (`bg-gradient-to-t from-zinc-950 via-zinc-900/80 to-transparent`) so the white text placed at the bottom remains perfectly legible.
- The title inside the card uses the Serif font. The meta-info (time, tags) is tiny sans-serif.
- Group cards in horizontally scrollable carousels.

### Recipe Detail Page (`/r/[id]`)
- **Hero Image:** Place the image at the top but with rounded corners (`rounded-2xl` or `rounded-3xl`), keeping a small margin from the screen edges.
- Add small floating icon buttons (like 'Save' or 'Share') overlaid on the bottom-left of the hero image.
- **Titles:** Center the Recipe Title (Serif) below the image, followed by a centered string of tags.
- **Author Block:** Create a flex row with a circular avatar image (`rounded-full w-10 h-10`), the author's name (Uppercase, Sans-serif), and a small, muted bio/description next to it.
- **Lists (Ingredients/Instructions):** Keep generous vertical spacing (`space-y-4`). Use simple, elegant bullet points for ingredients.

Ensure all Shadcn UI components (if used) are customized to override their default borders and backgrounds to match this dark, elegant zinc theme.