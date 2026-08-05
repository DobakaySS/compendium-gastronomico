"use client"

import { RecipeTimeline, type TimelineLog } from "@/components/recipes/recipe-timeline"
import { LogEntryForm, type AuthorOption } from "@/components/recipes/log-entry-form"
import { addRecipeLogAction } from "@/app/actions/recipe-logs"

type RecipeLogbookProps = {
  recipeId: string
  logs: TimelineLog[]
  authors: AuthorOption[]
  canWrite: boolean
  currentUserId: string | null
}

export function RecipeLogbook({
  recipeId,
  logs,
  authors,
  canWrite,
  currentUserId,
}: RecipeLogbookProps) {
  return (
    <section>
      <h2 className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
        Caderno de experimentos
      </h2>
      <div className="mt-6">
        <RecipeTimeline
          logs={logs}
          currentUserId={currentUserId}
          canManageAll={canWrite}
        />
      </div>
      {canWrite && (
        <LogEntryForm recipeId={recipeId} authors={authors} action={addRecipeLogAction} />
      )}
    </section>
  )
}
