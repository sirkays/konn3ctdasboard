import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const getEstimatedMenuHeight = (maxMenuHeight, searchable) => {
  const value = String(maxMenuHeight);
  const numericValue = Number.parseFloat(value);
  const cssHeight = value.endsWith("rem") ? numericValue * 16 : numericValue;
  const fallbackHeight = searchable ? 336 : 288;

  return Math.min(Number.isFinite(cssHeight) ? cssHeight : fallbackHeight, fallbackHeight);
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
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState(null);
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
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (
        !wrapperRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const updatePosition = () => {
      const trigger = wrapperRef.current?.querySelector("button");
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const gap = 8;
      const estimatedMenuHeight = getEstimatedMenuHeight(maxMenuHeight, searchable);
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const openAbove = spaceBelow < estimatedMenuHeight && rect.top > spaceBelow;

      setMenuPosition({
        left: rect.left,
        top: openAbove ? Math.max(gap, rect.top - gap) : rect.bottom + gap,
        width: rect.width,
        transform: openAbove ? "translateY(-100%)" : undefined,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [maxMenuHeight, open, searchable]);

  useEffect(() => {
    if (open && searchable) {
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
    if (!open) setQuery("");
  }, [open, searchable]);

  const handleSelect = (nextValue) => {
    onValueChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      {name && <input type="hidden" name={name} value={currentValue} required={required} />}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        data-open={open}
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
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

      {open && menuPosition && createPortal(
        <div
          ref={menuRef}
          style={menuPosition}
          className={cn(
            "fixed z-[1000] overflow-hidden rounded-xl border border-border/70 bg-popover text-popover-foreground shadow-2xl shadow-black/20",
            menuClassName
          )}
        >
          {searchable && (
            <div className="border-b border-border/50 p-2">
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-border/60 bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-brand-green/50"
              />
            </div>
          )}

          <div role="listbox" className="overflow-y-auto p-1.5" style={{ maxHeight: maxMenuHeight }}>
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
        </div>,
        document.body
      )}
    </div>
  );
}

const formatTimeLabel = (value) => {
  const [hourPart, minutePart] = String(value).split(":");
  const hour = Number(hourPart);
  if (!Number.isFinite(hour)) return value;

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutePart ?? "00"} ${period}`;
};

const buildTimeOptions = (minuteStep = 5, value) => {
  const step = Number.isFinite(Number(minuteStep)) && Number(minuteStep) > 0 ? Number(minuteStep) : 5;
  const options = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += step) {
      const optionValue = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      options.push({ value: optionValue, label: formatTimeLabel(optionValue) });
    }
  }

  if (value && !options.some((option) => option.value === value)) {
    options.unshift({ value, label: formatTimeLabel(value) });
  }

  return options;
};

export function ModernTimeSelect({ minuteStep = 5, options, value, ...props }) {
  const timeOptions = useMemo(
    () => options ?? buildTimeOptions(minuteStep, value),
    [minuteStep, options, value]
  );

  return (
    <ModernSelect
      {...props}
      value={value}
      options={timeOptions}
      triggerClassName={cn("font-mono", props.triggerClassName)}
      menuClassName={cn("min-w-[12rem]", props.menuClassName)}
      searchable={props.searchable ?? false}
      placeholder={props.placeholder ?? "Select time"}
      maxMenuHeight={props.maxMenuHeight ?? "16rem"}
    />
  );
}

export function ModernTimeSelectIcon() {
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}
