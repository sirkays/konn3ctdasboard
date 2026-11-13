import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "src/lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export const formatDateForInput = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseInputDate = (value) => {
  if (!value) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const startOfDay = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const getCalendarCells = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const cells = [];

  for (let index = mondayOffset - 1; index >= 0; index -= 1) {
    cells.push({
      date: new Date(year, month - 1, daysInPreviousMonth - index),
      outside: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false });
  }

  const nextMonthDayCount = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= nextMonthDayCount; day += 1) {
    cells.push({ date: new Date(year, month + 1, day), outside: true });
  }

  return cells;
};

export function BrandedCalendar({
  value,
  onChange,
  minDate,
  className,
  onCommit,
  size = "regular",
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const selectedDate = parseInputDate(value);
  const selectedYear = selectedDate?.getFullYear();
  const selectedMonth = selectedDate?.getMonth();
  const activeDate = selectedDate || today;
  const [viewYear, setViewYear] = useState(activeDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(activeDate.getMonth());

  useEffect(() => {
    if (selectedYear === undefined || selectedMonth === undefined) return;
    setViewYear(selectedYear);
    setViewMonth(selectedMonth);
  }, [selectedYear, selectedMonth]);

  const cells = getCalendarCells(viewYear, viewMonth);
  const normalizedMinDate = minDate ? startOfDay(minDate) : null;
  const monthProgress = ((activeDate.getDate() - 1) / Math.max(new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0).getDate() - 1, 1)) * 100;
  const compact = size === "compact";

  const shiftMonth = (direction) => {
    const next = new Date(viewYear, viewMonth + direction, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const selectDate = (date) => {
    if (normalizedMinDate && startOfDay(date) < normalizedMinDate) return;
    onChange?.(date);
    onCommit?.(date);
  };

  return (
    <div
      className={cn(
        "w-full select-none border border-border/70 bg-popover text-popover-foreground shadow-sm",
        "dark:bg-surface dark:shadow-black/20",
        compact ? "max-w-[292px] rounded-2xl p-4" : "max-w-[360px] rounded-[28px] p-5",
        className
      )}
    >
      <div className={cn("flex items-start justify-between gap-3", compact ? "mb-4" : "mb-5 gap-4")}>
        <div>
          <div className={cn("font-semibold leading-none text-foreground", compact ? "text-3xl" : "text-4xl")}>
            {activeDate.getDate()}
          </div>
          <div className={cn("mt-1 font-medium text-muted-foreground", compact ? "text-lg" : "text-xl")}>
            {MONTHS[activeDate.getMonth()]}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => shiftMonth(-1)}
            className={cn("rounded-lg text-muted-foreground hover:bg-brand-green/10 hover:text-brand-green", compact ? "h-7 w-7" : "h-8 w-8")}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => shiftMonth(1)}
            className={cn("rounded-lg text-muted-foreground hover:bg-brand-green/10 hover:text-brand-green", compact ? "h-7 w-7" : "h-8 w-8")}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className={cn("grid place-items-center rounded-lg border border-border/60 bg-background shadow-sm", compact ? "h-10 w-10" : "h-12 w-12")}>
            <CalendarDays className={cn("text-brand-green", compact ? "h-5 w-5" : "h-6 w-6")} />
          </div>
        </div>
      </div>

      <div className={cn("grid grid-cols-4 gap-1", compact ? "mb-4" : "mb-5")}>
        {[0, 1, 2, 3].map((step) => (
          <span
            key={step}
            className="h-1 rounded-full bg-muted"
          >
            <span
              className="block h-full rounded-full bg-brand-green transition-all"
              style={{
                width:
                  monthProgress >= step * 25
                    ? `${Math.min(Math.max(monthProgress - step * 25, 0), 25) * 4}%`
                    : "0%",
              }}
            />
          </span>
        ))}
      </div>

      <div className={cn("flex items-center justify-between", compact ? "mb-1.5" : "mb-2")}>
        <p className={cn("font-semibold text-foreground", compact ? "text-xs" : "text-sm")}>
          {MONTHS[viewMonth]} {viewYear}
        </p>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={`${weekday}-${index}`}
            className={cn("grid place-items-center font-semibold text-muted-foreground", compact ? "h-7 text-xs" : "h-8 text-sm")}
          >
            {weekday}
          </div>
        ))}

        {cells.map(({ date, outside }) => {
          const dateKey = formatDateForInput(date);
          const disabled = normalizedMinDate && startOfDay(date) < normalizedMinDate;
          const selected = selectedDate && formatDateForInput(selectedDate) === dateKey;
          const current = formatDateForInput(today) === dateKey;

          return (
            <button
              key={dateKey}
              type="button"
              disabled={disabled}
              onClick={() => selectDate(date)}
              className={cn(
                "grid w-full place-items-center rounded-lg font-semibold transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-brand-green/30",
                compact ? "h-8 text-xs" : "h-9 text-sm",
                outside && "text-muted-foreground/45",
                disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground/40 line-through opacity-60",
                !disabled && !selected && "hover:bg-brand-green/10 hover:text-brand-green",
                current && !selected && !disabled && "text-brand-green",
                selected && "bg-brand-green text-white shadow-sm shadow-brand-green/25"
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BrandedDatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Pick a date",
  triggerClassName,
  contentClassName,
  align = "start",
  disabled,
  showTriggerIcon = true,
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseInputDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-start rounded-xl border-border/60 bg-black/[0.02] px-3 text-left text-sm font-normal hover:bg-black/[0.04]",
            "focus-visible:ring-brand-green/30 focus-visible:border-brand-green/50",
            !selectedDate && "text-muted-foreground",
            triggerClassName
          )}
        >
          {showTriggerIcon && <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />}
          {selectedDate
            ? selectedDate.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("w-auto border-0 bg-transparent p-0 shadow-none", contentClassName)}
      >
        <BrandedCalendar
          value={selectedDate}
          minDate={minDate}
          onChange={onChange}
          onCommit={() => setOpen(false)}
          size="compact"
        />
      </PopoverContent>
    </Popover>
  );
}
