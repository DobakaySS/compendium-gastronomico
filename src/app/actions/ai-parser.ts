"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/crud"
import { isAmountlessUnit, isQualitativeUnit } from "@/lib/units"
import type { Ingredient } from "@/lib/schema"

// ---------------------------------------------------------------------------
// Tipos do parser
// ---------------------------------------------------------------------------

export type ParsedRecipe = {
  title: string
  base_servings: number
  prep_time_minutes: number
  effort_level: number
  instructions: Array<{ text: string }>
  techniques: string[]
}

export type AiMacros = {
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
}

export type MatchedIngredient = {
  ai_name: string
  amount_used: number
  unit: string
  match_type: "exact"
  macros: AiMacros
  grams_per_unit: number | null
  db_ingredient: Pick<Ingredient, "id" | "name" | "default_unit">
}

export type UnmatchedIngredient = {
  ai_name: string
  amount_used: number
  unit: string
  match_type: "unmatched"
  macros: AiMacros
  grams_per_unit: number | null
  suggestions: Array<
    Pick<Ingredient, "id" | "name" | "default_unit">
  >
}

export type ParsedIngredient = MatchedIngredient | UnmatchedIngredient

export type ParseResult = {
  recipe: ParsedRecipe
  ingredients: ParsedIngredient[]
}

export type ParseResponse =
  | { ok: true; data: ParseResult }
  | { ok: false; error: string }

export type ConfirmedIngredient = {
  ai_name: string
  amount_used: number
  unit: string
  ingredient_id?: string
  create_new?: {
    name: string
    default_unit: string
    macros?: AiMacros
    grams_per_unit?: number | null
  }
}

export type SaveImportPayload = {
  recipe: ParsedRecipe
  ingredients: ConfirmedIngredient[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value)
  if (typeof value === "string") {
    const n = Math.round(Number(value))
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function toNum(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function toOptionalNum(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 10) / 10
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value)
    if (Number.isFinite(n)) return Math.round(n * 10) / 10
  }
  return null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
  if (typeof value === "string") return [value.trim()]
  return []
}

function normalizeInstructions(value: unknown): Array<{ text: string }> {
  if (!Array.isArray(value)) return []
  return value
    .map((step) => {
      if (typeof step === "string") return { text: step.trim() }
      if (step && typeof step === "object" && "text" in step) {
        return { text: String((step as { text: string }).text).trim() }
      }
      return null
    })
    .filter((v): v is { text: string } => v !== null && v.text.length > 0)
}

type AiIngredient = {
  name: string
  amount_used: number
  unit: string
  macros: AiMacros
  grams_per_unit: number | null
}

function normalizeAiMacros(value: unknown): AiMacros {
  const empty: AiMacros = {
    kcal_per_100g: null,
    protein_per_100g: null,
    carbs_per_100g: null,
    fat_per_100g: null,
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty
  const o = value as Record<string, unknown>
  return {
    kcal_per_100g: toOptionalNum(o.kcal_per_100g),
    protein_per_100g: toOptionalNum(o.protein_per_100g),
    carbs_per_100g: toOptionalNum(o.carbs_per_100g),
    fat_per_100g: toOptionalNum(o.fat_per_100g),
  }
}

// Normaliza a unidade retornada pela IA para o vocabulário do app.
function normalizeUnit(raw: unknown): string {
  const unit = String(raw ?? "g").trim().toLowerCase()
  if (unit === "à gosto" || unit === "q.b." || unit === "qb") return "a gosto"
  if (unit === "pitada" || unit === "gotas") return unit
  return unit
}

function normalizeAiIngredients(value: unknown): AiIngredient[] {
  if (!Array.isArray(value)) return []
  return value
    .map((i) => {
      if (!i || typeof i !== "object") return null
      const o = i as Record<string, unknown>
      const name = String(o.name ?? "").trim()
      const unit = normalizeUnit(o.unit)
      const amount = toNum(o.amount_used, 0)
      if (!name) return null
      // Unidades qualitativas aceitam quantidade 0; "a gosto" é ignorada.
      if (amount <= 0 && !isQualitativeUnit(unit)) return null
      return {
        name,
        amount_used: isAmountlessUnit(unit) ? 0 : amount,
        unit,
        macros: normalizeAiMacros(o.macros_per_100g),
        grams_per_unit: toOptionalNum(o.grams_per_unit),
      }
    })
    .filter(Boolean) as AiIngredient[]
}

// ---------------------------------------------------------------------------
// System prompt (pt-BR)
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Você é um especialista em culinária que extrai receitas de textos não estruturados.
Analise o texto fornecido e retorne APENAS um objeto JSON válido, sem comentários, markdown ou texto adicional.

Siga estritamente este schema:

{
  "title": "string (nome da receita)",
  "base_servings": number (quantas porções, padrão 4 se não especificado),
  "prep_time_minutes": number (tempo total em minutos, padrão 30 se não especificado),
  "effort_level": number (nível de esforço de 1=muito fácil a 5=muito difícil),
  "instructions": [{"text": "string"}],
  "techniques": ["string"] (técnicas culinárias, ex: "refogar", "assar", "emulsionar", "redução"),
  "ingredients": [
    {
      "name": "string (nome do ingrediente)",
      "amount_used": number (quantidade, ex: 500; use 0 para "a gosto"),
      "unit": "string (unidade: g, kg, ml, l, unidade, xícara, colher (sopa), colher (chá), a gosto, pitada, gotas)",
      "grams_per_unit": number|null (média de gramas por unidade quando unit é "unidade", ex: 120 para tomate médio; null caso contrário),
      "macros_per_100g": {
        "kcal_per_100g": number|null (kcal por 100g, null se desconhecer),
        "protein_per_100g": number|null (g por 100g),
        "carbs_per_100g": number|null (g por 100g),
        "fat_per_100g": number|null (g por 100g)
      }
    }
  ]
}

Regras:
- Instruções DEVEM ser array de objetos {"text": "..."}, um por passo.
- Ingredientes DEVEM ser array de objetos com name, amount_used, unit.
- Para "a gosto" (ou "à gosto", "q.b."), use a unidade "a gosto" e amount_used = 0.
- Para "pitada" e "gotas", informe a quantidade quando presente no texto (ex.: 2 gotas, 1 pitada); se não houver, use amount_used = 0.
- Quando unit for "unidade" (ex.: 2 tomates, 1 cebola), estime "grams_per_unit" com o peso médio em gramas de uma unidade; caso contrário, use null.
- Retorne APENAS o JSON, sem texto introdutório.`

// ---------------------------------------------------------------------------
// Gemini helper (genérico, JSON)
// ---------------------------------------------------------------------------

async function requestGeminiJson(
  systemInstruction: string,
  userText: string
): Promise<Record<string, unknown>> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.")
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
  })

  const result = await model.generateContent({
    systemInstruction,
    contents: [{ role: "user", parts: [{ text: userText }] }],
  })

  const jsonText = result.response.text()

  let json: unknown
  try {
    json = JSON.parse(jsonText)
  } catch {
    throw new Error(
      "A IA retornou uma resposta inválida. Tente novamente com um texto mais claro."
    )
  }

  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("Formato de resposta inesperado da IA.")
  }

  return json as Record<string, unknown>
}

function geminiErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : "Erro desconhecido"
  if (message.includes("API key") || message.includes("GEMINI")) {
    return "Chave da API Gemini não configurada. Adicione GEMINI_API_KEY ao .env.local."
  }
  return `Falha na comunicação com a IA: ${message}`
}

async function callGemini(rawText: string): Promise<{
  recipe: ParsedRecipe
  aiIngredients: AiIngredient[]
}> {
  const obj = await requestGeminiJson(SYSTEM_PROMPT, rawText)

  const recipe: ParsedRecipe = {
    title: String(obj.title ?? "").trim(),
    base_servings: clamp(toInt(obj.base_servings, 4), 1, 100),
    prep_time_minutes: clamp(toInt(obj.prep_time_minutes, 30), 0, 1440),
    effort_level: clamp(toInt(obj.effort_level, 2), 1, 5),
    instructions: normalizeInstructions(obj.instructions),
    techniques: normalizeStringArray(obj.techniques),
  }

  if (!recipe.title || recipe.instructions.length === 0) {
    throw new Error(
      "A IA não conseguiu extrair título e instruções. Verifique o texto enviado."
    )
  }

  const aiIngredients = normalizeAiIngredients(obj.ingredients)

  return { recipe, aiIngredients }
}

// ---------------------------------------------------------------------------
// parseRecipeAction — chama Gemini + fuzzy match no Supabase
// ---------------------------------------------------------------------------

export async function parseRecipeAction(
  rawText: string
): Promise<ParseResponse> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { ok: false, error: auth.message }

  let recipe: ParsedRecipe
  let aiIngredients: AiIngredient[]

  try {
    const result = await callGemini(rawText)
    recipe = result.recipe
    aiIngredients = result.aiIngredients
  } catch (err: unknown) {
    return { ok: false, error: geminiErrorMessage(err) }
  }

  // Fuzzy match contra DB
  const { data: dbIngredients } = await auth.supabase
    .from("ingredients")
    .select("id, name, default_unit")

  const allDb = (dbIngredients ?? []) as Array<Pick<Ingredient, "id" | "name" | "default_unit">>

  const ingredients: ParsedIngredient[] = aiIngredients.map((ai) => {
    const norm = ai.name.toLowerCase().trim()
    const matches = allDb.filter(
      (db) =>
        db.name.toLowerCase().includes(norm) ||
        norm.includes(db.name.toLowerCase())
    )

    const exact = matches.find(
      (db) => db.name.toLowerCase() === norm
    )

    if (exact) {
      return {
        ai_name: ai.name,
        amount_used: ai.amount_used,
        unit: ai.unit,
        match_type: "exact",
        macros: ai.macros,
        grams_per_unit: ai.grams_per_unit,
        db_ingredient: exact,
      } satisfies MatchedIngredient
    }

    return {
      ai_name: ai.name,
      amount_used: ai.amount_used,
      unit: ai.unit,
      match_type: "unmatched",
      macros: ai.macros,
      grams_per_unit: ai.grams_per_unit,
      suggestions: matches,
    } satisfies UnmatchedIngredient
  })

  return { ok: true, data: { recipe, ingredients } }
}

// ---------------------------------------------------------------------------
// fetchIngredientMacrosAction — estima macros por 100g de um ingrediente
// ---------------------------------------------------------------------------

const MACROS_SYSTEM_PROMPT = `Você é um especialista em composição nutricional de alimentos.
Receba o nome de um alimento/ingrediente e retorne APENAS um objeto JSON válido,
sem comentários ou texto adicional, com a seguinte estrutura:

{
  "kcal_per_100g": number|null (calorias por 100g),
  "protein_per_100g": number|null (proteína em g por 100g),
  "carbs_per_100g": number|null (carboidratos em g por 100g),
  "fat_per_100g": number|null (gorduras em g por 100g)
}

Use valores estimados para o alimento cru/in natura na forma mais comum de uso culinário.
Use null quando não tiver certeza razoável. Valores devem ser números positivos.`

export type FetchMacrosResponse =
  | { ok: true; data: AiMacros }
  | { ok: false; error: string }

export async function fetchIngredientMacrosAction(
  ingredientName: string
): Promise<FetchMacrosResponse> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { ok: false, error: auth.message }

  try {
    const obj = await requestGeminiJson(MACROS_SYSTEM_PROMPT, ingredientName)
    return {
      ok: true,
      data: {
        kcal_per_100g: toOptionalNum(obj.kcal_per_100g),
        protein_per_100g: toOptionalNum(obj.protein_per_100g),
        carbs_per_100g: toOptionalNum(obj.carbs_per_100g),
        fat_per_100g: toOptionalNum(obj.fat_per_100g),
      },
    }
  } catch (err: unknown) {
    return { ok: false, error: geminiErrorMessage(err) }
  }
}

// ---------------------------------------------------------------------------
// saveSmartImport — cria ingredientes novos + receita + links
// ---------------------------------------------------------------------------

export async function saveSmartImport(
  payload: SaveImportPayload
): Promise<never> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) throw new Error(auth.message)

  const supabase = auth.supabase
  const { recipe, ingredients: confIngredients } = payload

  const resolvedIds: Array<{
    ingredient_id: string
    amount_used: number
    unit: string
  }> = []

  for (const ci of confIngredients) {
    if (ci.ingredient_id) {
      resolvedIds.push({
        ingredient_id: ci.ingredient_id,
        amount_used: ci.amount_used,
        unit: ci.unit,
      })
      continue
    }

    if (ci.create_new) {
      const macros = ci.create_new.macros ?? {
        kcal_per_100g: null,
        protein_per_100g: null,
        carbs_per_100g: null,
        fat_per_100g: null,
      }
      // Unidades qualitativas não podem ser a unidade padrão do ingrediente.
      const defaultUnit = isQualitativeUnit(ci.create_new.default_unit)
        ? "g"
        : ci.create_new.default_unit
      const { data: created, error: createErr } = await supabase
        .from("ingredients")
        .insert({
          name: ci.create_new.name,
          default_unit: defaultUnit,
          grams_per_unit: ci.create_new.grams_per_unit ?? null,
          kcal_per_100g: macros.kcal_per_100g,
          protein_per_100g: macros.protein_per_100g,
          carbs_per_100g: macros.carbs_per_100g,
          fat_per_100g: macros.fat_per_100g,
        })
        .select("id")
        .single()

      if (createErr) {
        throw new Error(
          `Erro ao criar ingrediente "${ci.create_new.name}": ${createErr.message}`
        )
      }

      resolvedIds.push({
        ingredient_id: (created as { id: string }).id,
        amount_used: ci.amount_used,
        unit: ci.unit,
      })
    }
  }

  const { data: createdRecipe, error: recipeErr } = await supabase
    .from("recipes")
    .insert({
      user_id: auth.userId,
      title: recipe.title,
      base_servings: recipe.base_servings,
      prep_time_minutes: recipe.prep_time_minutes,
      effort_level: recipe.effort_level,
      instructions: recipe.instructions,
      techniques: recipe.techniques,
      parent_recipe_id: null,
    })
    .select("id")
    .single()

  if (recipeErr) {
    throw new Error(`Erro ao criar receita: ${recipeErr.message}`)
  }

  const recipeId = (createdRecipe as { id: string }).id

  if (resolvedIds.length > 0) {
    const rows = resolvedIds.map((ri) => ({
      recipe_id: recipeId,
      ingredient_id: ri.ingredient_id,
      amount_used: ri.amount_used,
      unit: ri.unit,
    }))

    const { error: linkErr } = await supabase
      .from("recipe_ingredients")
      .insert(rows)

    if (linkErr) {
      await supabase.from("recipes").delete().eq("id", recipeId)
      throw new Error(
        `Erro ao vincular ingredientes: ${linkErr.message}`
      )
    }
  }

  revalidatePath("/")
  redirect(`/r/${recipeId}`)
}
