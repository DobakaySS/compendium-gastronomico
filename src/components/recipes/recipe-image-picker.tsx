"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ImageIcon, Loader2Icon, Trash2Icon, UploadIcon } from "lucide-react"

const BUCKET = "recipe-images"
const MAX_SIZE_MB = 5
const ALLOWED_EXTS = ["png", "jpg", "jpeg", "webp", "gif"]

type Props = {
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

function extractStoragePath(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length))
}

async function deleteStorageObject(path: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.error("Erro ao excluir imagem do storage:", error.message)
  }
}

export function RecipeImagePicker({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("O arquivo selecionado não é uma imagem.")
      return
    }
    const nameExt = file.name.split(".").pop()?.toLowerCase() ?? ""
    const ext = ALLOWED_EXTS.includes(nameExt)
      ? nameExt === "jpeg"
        ? "jpg"
        : nameExt
      : undefined
    if (!ext) {
      toast.error("Formato não suportado. Use PNG, JPG, WEBP ou GIF.")
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Imagem muito grande. Máximo de ${MAX_SIZE_MB} MB.`)
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const path = `${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (uploadError) {
        if (/bucket|não existe|not found/i.test(uploadError.message)) {
          toast.error(
            "Bucket de imagens não criado. Aplique a migration 0008 no SQL Editor do Supabase (Storage)."
          )
        } else {
          toast.error(`Falha ao enviar a imagem: ${uploadError.message}`)
        }
        return
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      onChange(data.publicUrl)

      // Exclui a imagem anterior apenas após o novo upload ter sucesso.
      if (value) {
        const oldPath = extractStoragePath(value)
        if (oldPath && oldPath !== path) {
          await deleteStorageObject(oldPath)
        }
      }
      toast.success("Imagem adicionada.")
    } catch {
      toast.error("Erro inesperado ao enviar a imagem.")
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!value) return
    const path = extractStoragePath(value)
    if (path) await deleteStorageObject(path)
    onChange(null)
    toast.success("Imagem removida.")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="aspect-[16/10] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 text-zinc-500">
            <ImageIcon className="size-8" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => {
            handleFileChange(e.target.files?.[0])
            e.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <UploadIcon className="size-4" />
              {value ? "Trocar imagem" : "Adicionar imagem"}
            </>
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={handleRemove}
          >
            <Trash2Icon className="size-4" />
            Remover
          </Button>
        )}
      </div>
    </div>
  )
}
