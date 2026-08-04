"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/crud"
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

export type MatchedIngredient = {
  ai_name: string
  amount_used: number
  unit: string
  match_type: "exact"
  db_ingredient: Pick<Ingredient, "id" | "name" | "default_unit">
}

export type UnmatchedIngredient = {
  ai_name: string
  amount_used: number
  unit: string
  match_type: "unmatched"
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
  create_new?: { name: string; default_unit: string }
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

type AiIngredient = { name: string; amount_used: number; unit: string }

function normalizeAiIngredients(value: unknown): AiIngredient[] {
  if (!Array.isArray(value)) return []
  return value
    .map((i) => {
      if (!i || typeof i !== "object") return null
      const o = i as Record<string, unknown>
      const name = String(o.name ?? "").trim()
      const amount = toNum(o.amount_used, 0)
      const unit = String(o.unit ?? "g").trim()
      if (!name || amount <= 0) return null
      return { name, amount_used: amount, unit }
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
      "amount_used": number (quantidade, ex: 500),
      "unit": "string (unidade: g, kg, ml, l, unidade, xícara, colher (sopa), colher (chá))"
    }
  ]
}

Regras:
- Instruções DEVEM ser array de objetos {"text": "..."}, um por passo.
- Ingredientes DEVEM ser array de objetos com name, amount_used, unit.
- Retorne APENAS o JSON, sem texto introdutório.`

// ---------------------------------------------------------------------------
// Gemini call + parse
// ---------------------------------------------------------------------------

async function callGemini(rawText: string): Promise<{
  recipe: ParsedRecipe
  aiIngredients: AiIngredient[]
}> {
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
    systemInstruction: SYSTEM_PROMPT,
    contents: [{ role: "user", parts: [{ text: rawText }] }],
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

  const obj = json as Record<string, unknown>

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
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    if (message.includes("API key") || message.includes("GEMINI")) {
      return { ok: false, error: "Chave da API Gemini não configurada. Adicione GEMINI_API_KEY ao .env.local." }
    }
    return { ok: false, error: `Falha na comunicação com a IA: ${message}` }
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
        db_ingredient: exact,
      } satisfies MatchedIngredient
    }

    return {
      ai_name: ai.name,
      amount_used: ai.amount_used,
      unit: ai.unit,
      match_type: "unmatched",
      suggestions: matches,
    } satisfies UnmatchedIngredient
  })

  return { ok: true, data: { recipe, ingredients } }
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
      const { data: created, error: createErr } = await supabase
        .from("ingredients")
        .insert({
          name: ci.create_new.name,
          default_unit: ci.create_new.default_unit,
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
