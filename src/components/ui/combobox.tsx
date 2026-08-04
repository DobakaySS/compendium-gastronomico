"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"

export type ComboboxOption = {
  value: string
  label: string
}

type ComboboxBaseProps = {
  options: ComboboxOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  disabled?: boolean
  className?: string
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado.",
  loading,
  disabled,
  className,
}: ComboboxBaseProps & {
  value?: string
  onValueChange?: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const selected = options.find((option) => option.value === value)

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase().trim())
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            type="button"
            disabled={disabled}
            className={className}
          />
        }
      >
        <span className="flex-1 truncate text-left font-normal text-popover-foreground">
          {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
        </span>
        <ChevronsUpDownIcon />
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Carregando...
              </div>
            ) : (
              <>
                <CommandEmpty>{emptyText}</CommandEmpty>
                <CommandGroup>
                  {filtered.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        onValueChange?.(option.value)
                        setOpen(false)
                        setSearch("")
                      }}
                    >
                      {option.label}
                      <CheckIcon
                        className={cn(
                          "ml-auto opacity-0",
                          option.value === value && "opacity-100"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function ComboboxMulti({
  options,
  values = [],
  onValueChange,
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  emptyText = "Nenhum resultado.",
  loading,
  disabled,
  className,
}: ComboboxBaseProps & {
  values?: string[]
  onValueChange?: (values: string[]) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const toggle = (value: string) => {
    const exists = values.includes(value)
    const next = exists ? values.filter((v) => v !== value) : [...values, value]
    onValueChange?.(next)
  }

  const selectedOptions = options.filter((o) => values.includes(o.value))
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase().trim())
  )

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              type="button"
              disabled={disabled}
            />
          }
        >
          <span className="flex-1 truncate text-left font-normal text-muted-foreground">
            {placeholder}
          </span>
          <ChevronsUpDownIcon />
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyText}</CommandEmpty>
                  <CommandGroup>
                    {filtered.map((option) => {
                      const isActive = values.includes(option.value)
                      return (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          onSelect={() => toggle(option.value)}
                        >
                          {option.label}
                          <CheckIcon
                            className={cn("ml-auto", !isActive && "opacity-0")}
                          />
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <Badge key={option.value} variant="secondary">
              {option.label}
              <button
                type="button"
                aria-label={`Remover ${option.label}`}
                className="ml-1 rounded-full outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => toggle(option.value)}
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}