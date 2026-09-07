import React, { useEffect, useMemo, useRef, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, Clock } from "lucide-react";

import { cn } from "../../lib/utils";

const normalizeOptions = (options = []) =>
  options.map((option) =>
    typeof option === "string"
      ? { label: option, value: option }
      : { ...option, value: String(option.value) }
  );

const getSelectedLabel = (options, value, placeholder) => {
  const selected = options.find((option) => option.value === String(value ?? ""));
  return selected?.label ?? placeholder;
};

export function ModernSelect({
  name,
  value,
  onValueChange,
  options = [],
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  emptyText = "No options found.",
  disabled = false,
  invalid = false,
  searchable = false,
  className,
  triggerClassName,
  menuClassName,
  accent = "green",
  maxMenuHeight = "15rem",
  required,
}) {
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectOptions = useMemo(() => normalizeOptions(options), [options]);
  const currentValue = String(value ?? "");
  const accentClasses =
    accent === "blue"
      ? "focus-visible:ring-brand-blue/30 data-[open=true]:border-brand-blue/60 data-[open=true]:ring-brand-blue/20"
      : "focus-visible:ring-brand-green/30 data-[open=true]:border-brand-green/60 data-[open=true]:ring-brand-green/20";
  const selectedAccent = accent === "blue" ? "text-brand-blue" : "text-brand-green";

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return selectOptions;
    return selectOptions.filter((option) =>
      `${option.label} ${option.description ?? ""}`.toLowerCase().includes(needle)
    );
  }, [query, selectOptions]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const handleSelect = (nextValue) => {
    onValueChange?.(nextValue);
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <div className={cn("relative w-full", className)}>
        {name && <input type="hidden" name={name} value={currentValue} required={required} />}
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            data-open={open}
            disabled={disabled}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/60 bg-black/[0.02] px-3 text-left text-sm text-foreground shadow-sm outline-none transition-all hover:border-border hover:bg-black/[0.04] focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
              "data-[open=true]:bg-surface data-[open=true]:ring-2",
              accentClasses,
              invalid && "border-red-500 data-[open=true]:border-red-500 data-[open=true]:ring-red-500/20 focus-visible:ring-red-500/20",
              triggerClassName
            )}
          >
            <span className={cn("min-w-0 truncate font-semibold", !currentValue && "text-muted-foreground")}>
              {getSelectedLabel(selectOptions, currentValue, placeholder)}
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={8}
            collisionPadding={8}
            onOpenAutoFocus={(event) => {
              if (searchable) {
                event.preventDefault();
                searchRef.current?.focus();
              }
            }}
            style={{ width: "var(--radix-popover-trigger-width)", maxHeight: "var(--radix-popover-content-available-height)" }}
            className={cn(
              "z-[1000] flex flex-col overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-2xl shadow-black/20",
              menuClassName
            )}
          >
            {searchable && (
              <div className="shrink-0 border-b border-border/50 p-2">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-green/50"
                />
              </div>
            )}

            <div role="listbox" className="min-h-0 overflow-y-auto p-1.5" style={{ maxHeight: maxMenuHeight }}>
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">{emptyText}</div>
              ) : (
                filteredOptions.map((option) => {
                  const selected = option.value === currentValue;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={option.disabled}
                      onClick={() => handleSelect(option.value)}
                      className={cn(
                        "flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
                        selected && "bg-accent/70 font-semibold"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{option.label}</span>
                        {option.description && (
                          <span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </span>
                      <Check className={cn("h-4 w-4 shrink-0 opacity-0", selected && `opacity-100 ${selectedAccent}`)} />
                    </button>
                  );
                })
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </div>
    </PopoverPrimitive.Root>
  );
}

export { ModernTimeSelect } from "./modern-time-select";

export function ModernTimeSelectIcon() {
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}
