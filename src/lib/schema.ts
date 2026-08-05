import { z } from "zod"
import { isQualitativeUnit } from "@/lib/units"

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
  grams_per_unit: number | null
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
  instructions: Array<string | { text: string }>
  image_url: string | null
  techniques: string[] | null
  parent_recipe_id: string | null
  version_name: string | null
  public_token: string | null
}

export type IngredientPrice = {
  id: string
  ingredient_id: string
  city: string
  price: number
  currency: string
  reference_amount: number
  reference_unit: string
  recorded_on: string
}

export type RecipeLog = {
  id: string
  recipe_id: string
  author_id: string
  note: string | null
  created_at: string
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

export type ShoppingList = {
  id: string
  user_id: string
  recipe_id: string | null
  title: string
  servings: number | null
  created_at: string
}

export type ShoppingListItem = {
  id: string
  shopping_list_id: string
  ingredient_id: string
  amount: number
  unit: string
  checked: boolean
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

export const IngredientSchema = z
  .object({
    name: requiredName,
    default_unit: z
      .string()
      .min(1, "Escolha a unidade padrão.")
      .refine((u) => !isQualitativeUnit(u), {
        message: "Use uma unidade mensurável como padrão.",
      }),
    grams_per_unit: optionalMacro,
    kcal_per_100g: optionalMacro,
    protein_per_100g: optionalMacro,
    carbs_per_100g: optionalMacro,
    fat_per_100g: optionalMacro,
  })
  .superRefine((val, ctx) => {
    if (
      val.default_unit === "unidade" &&
      (val.grams_per_unit == null || val.grams_per_unit <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["grams_per_unit"],
        message: "Informe a média de g por unidade.",
      })
    }
  })

export const InstructionStepSchema = z.object({
  text: z.string().min(1, "Passo não pode ser vazio."),
})

export const IngredientLineSchema = z
  .object({
    ingredient_id: z.string().min(1, "Escolha um ingrediente."),
    amount_used: z
      .number()
      .nonnegative("Quantidade não pode ser negativa.")
      .max(100000, "Quantidade muito alta."),
    unit: z.string().min(1, "Informe a unidade."),
  })
  .superRefine((val, ctx) => {
    if (!isQualitativeUnit(val.unit) && val.amount_used <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount_used"],
        message: "Quantidade deve ser maior que zero.",
      })
    }
  })

export const RecipeSchema = z.object({
  title: requiredName,
  image_url: z.string().nullable(),
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

// ---------------------------------------------------------------------------
// Phase 3 — Listas de compras
// ---------------------------------------------------------------------------

export const ShoppingListItemSchema = z.object({
  ingredient_id: z.string().min(1, "Ingrediente inválido."),
  amount: z
    .number()
    .positive("Quantidade deve ser maior que zero.")
    .max(100000, "Quantidade muito alta."),
  unit: z.string().min(1, "Informe a unidade."),
})

export const ShoppingListSchema = z.object({
  recipe_id: z.string().min(1, "Receita inválida."),
  title: z.string().min(1, "Informe um título.").max(200, "Título muito longo."),
  servings: z.number().min(1, "Entre 1 e 100 porções.").max(100, "Entre 1 e 100 porções."),
  items: z
    .array(ShoppingListItemSchema)
    .min(1, "Adicione ao menos um item à lista."),
})

export type ShoppingListFormValues = z.infer<typeof ShoppingListSchema>

// ---------------------------------------------------------------------------
// Phase 2 — Versioning & calculations
// ---------------------------------------------------------------------------

export type RecipeVersion = {
  id: string
  title: string
  version_name: string | null
  image_url: string | null
  base_servings: number
  prep_time_minutes: number | null
  effort_level: number | null
  instructions: Array<string | { text: string }>
  created_at: string
}

export type IngredientWithMacros = Ingredient

export type RecipeIngredientWithMacros = {
  ingredient_id: string
  amount_used: number | null
  unit: string | null
  ingredients: IngredientWithMacros | IngredientWithMacros[] | null
}