import { cn } from "@/lib/utils"
import type { Tag } from "@/lib/schema"

type TagBadgeProps = {
  tag: Pick<Tag, "name" | "color">
  className?: string
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-full border border-transparent px-2.5 py-0.5 text-[0.65rem] font-medium tracking-wide",
        className
      )}
      style={{
        backgroundColor: `${tag.color}1f`,
        color: tag.color,
        borderColor: `${tag.color}4d`,
      }}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
    </span>
  )
}
