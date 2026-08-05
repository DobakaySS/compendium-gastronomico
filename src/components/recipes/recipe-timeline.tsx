"use client"

import { formatDate } from "@/lib/format-date"
import { RecipeLogActions } from "@/components/recipes/recipe-log-actions"

export type TimelineLog = {
  id: string
  user_id: string
  note: string | null
  created_at: string
  author_name: string
}

type RecipeTimelineProps = {
  logs: TimelineLog[]
  currentUserId: string | null
  canManageAll: boolean
}

export function RecipeTimeline({
  logs,
  currentUserId,
  canManageAll,
}: RecipeTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
        <p className="text-sm text-zinc-500">
          Nenhum registro de experimento ainda.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />

      <ul className="flex flex-col gap-8">
        {logs.map((log) => {
          const canManage = canManageAll || log.user_id === currentUserId
          return (
            <li key={log.id} className="relative flex gap-4 pl-8">
              <span className="absolute left-0 top-0.5 flex size-[23px] shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900">
                <span className="size-[7px] rounded-full bg-zinc-600" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                    {formatDate(log.created_at)}
                  </span>
                  <span className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-600">
                    ·
                  </span>
                  <span className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-400">
                    {log.author_name}
                  </span>
                  {canManage && (
                    <RecipeLogActions
                      logId={log.id}
                      initialNote={log.note ?? ""}
                    />
                  )}
                </div>

                <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                  {log.note}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
