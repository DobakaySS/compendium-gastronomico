import { z } from "zod"

// ---------------------------------------------------------------------------
// Types (Supabase relational schema)
// ---------------------------------------------------------------------------

export type Author = {
  id: string
  name: string
  user_id: string
}

export type Ingredient = {
  id: string
  name: string
  default_unit: string | null
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
}

export type Recipe = {
  id: string
  user_id: string
  title: string
  base_servings: number
  prep_time_minutes: number
  effort_level: number
  instructions: string[]
  parent_recipe_id: string | null
  version_name: string | null
  public_token: string | null
}

export type RecipeIngredient = {
  recipe_id: string
  ingredient_id: string
  amount_used: number
  unit: string
}

export type RecipeAuthor = {
  recipe_id: string
  author_id: string
}

// ---------------------------------------------------------------------------
// Reusable field schemas
// ---------------------------------------------------------------------------

const requiredName = z
  .string()
  .min(1, "Informe o nome.")
  .max(200, "Nome muito longo.")

// Valores numéricos opcionais (null quando vazio). Coerção feita no form
// via `setValueAs`, mantendo input === output no schema.
export const optionalMacro = z
  .number()
  .min(0, "Valor inválido (0–9999).")
  .max(9999, "Valor inválido (0–9999).")
  .nullable()

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const AuthorSchema = z.object({
  name: requiredName,
})

export const IngredientSchema = z.object({
  name: requiredName,
  default_unit: z.string().min(1, "Escolha a unidade padrão."),
  kcal_per_100g: optionalMacro,
  protein_per_100g: optionalMacro,
  carbs_per_100g: optionalMacro,
  fat_per_100g: optionalMacro,
})

export const InstructionStepSchema = z.object({
  text: z.string().min(1, "Passo não pode ser vazio."),
})

export const IngredientLineSchema = z.object({
  ingredient_id: z.string().min(1, "Escolha um ingrediente."),
  amount_used: z
    .number()
    .positive("Quantidade deve ser maior que zero.")
    .max(100000, "Quantidade muito alta."),
  unit: z.string().min(1, "Informe a unidade."),
})

export const RecipeSchema = z.object({
  title: requiredName,
  base_servings: z.number().min(1, "Entre 1 e 100 porções.").max(100, "Entre 1 e 100 porções."),
  prep_time_minutes: z.number().min(0, "Tempo entre 0 e 1440 min.").max(1440, "Tempo entre 0 e 1440 min."),
  effort_level: z.number().min(1, "Esforço entre 1 e 5.").max(5, "Esforço entre 1 e 5."),
  instructions: z
    .array(InstructionStepSchema)
    .min(1, "Adicione ao menos um passo."),
  ingredients: z
    .array(IngredientLineSchema)
    .min(1, "Adicione ao menos um ingrediente."),
  author_ids: z.array(z.string()),
})

export type AuthorFormValues = z.infer<typeof AuthorSchema>
export type IngredientFormValues = z.infer<typeof IngredientSchema>
export type RecipeFormValues = z.infer<typeof RecipeSchema>
export type IngredientLineValues = z.infer<typeof IngredientLineSchema>