import React, { useId, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ArrowRight, Clock } from "lucide-react";
import { cn } from "../../lib/utils";

const pad = (value) => String(value).padStart(2, "0");
const parseTime = (value) => {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? ""));
  return match && Number(match[1]) < 24 && Number(match[2]) < 60
    ? { hour: Number(match[1]), minute: Number(match[2]) }
    : null;
};
const displayTime = ({ hour, minute }, use24Hour) =>
  `${pad(use24Hour ? hour : hour % 12 || 12)}:${pad(minute)}${use24Hour ? "" : hour >= 12 ? " PM" : " AM"}`;

export function ModernTimeSelect({
  value, onValueChange, name, disabled = false, invalid = false,
  required = false, placeholder = "Select time", className,
  triggerClassName, menuClassName, accent = "green", "aria-label": ariaLabel, minTime,
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [use24Hour, setUse24Hour] = useState(false);
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("AM");
  const selected = parseTime(value);
  const valid = /^\d{1,2}$/.test(hour) && /^\d{1,2}$/.test(minute)
    && Number(hour) >= (use24Hour ? 0 : 1) && Number(hour) <= (use24Hour ? 23 : 12)
    && Number(minute) <= 59;
  const draft = {
    hour: use24Hour ? Number(hour) : Number(hour) % 12 + (period === "PM" ? 12 : 0),
    minute: Number(minute),
  };
  const belowMin = Boolean(minTime) && valid && (draft.hour * 60 + draft.minute) < (minTime.hour * 60 + minTime.minute);
  const active = accent === "blue" ? "bg-brand-blue text-white" : "bg-brand-green text-white";
  const focus = "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const loadTime = (time, format = use24Hour) => {
    setHour(pad(format ? time.hour : time.hour % 12 || 12));
    setMinute(pad(time.minute));
    setPeriod(time.hour >= 12 ? "PM" : "AM");
  };
  const changeOpen = (next) => {
    if (next) loadTime(selected ?? { hour: 9, minute: 0 });
    setOpen(next);
  };
  const apply = () => {
    if (!valid || disabled || belowMin) return;
    onValueChange?.(`${pad(draft.hour)}:${pad(draft.minute)}`);
    setOpen(false);
  };

  return (
    <div className={cn("w-full", className)}>
      {name && <input type="hidden" name={name} value={value ?? ""} disabled={disabled} />}
      <Popover.Root open={open && !disabled} onOpenChange={changeOpen}>
        <Popover.Trigger asChild>
          <button type="button" role="combobox" disabled={disabled} aria-label={ariaLabel ?? "Choose time"}
            aria-expanded={open && !disabled} aria-controls={`${id}-panel`} aria-haspopup="dialog"
            aria-invalid={invalid} aria-required={required}
            className={cn("group flex h-11 w-full items-center gap-3 rounded-xl border border-border/60 bg-surface px-3 text-sm shadow-sm transition-colors hover:border-brand-green/50 disabled:cursor-not-allowed disabled:opacity-50", focus, invalid && "border-red-500", triggerClassName)}>
            <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className={cn("flex-1 text-left font-semibold tabular-nums", !selected && "text-muted-foreground")}>{selected ? displayTime(selected, use24Hour) : placeholder}</span>
            <span aria-hidden="true" className="rounded-md bg-muted px-1.5 py-1 text-[9px] font-bold tracking-wider text-muted-foreground">{use24Hour ? "24H" : "12H"}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content id={`${id}-panel`} align="start" sideOffset={8} collisionPadding={12} aria-labelledby={`${id}-title`}
            onKeyDown={(event) => { if (event.key === "Enter" && event.target.tagName === "INPUT") { event.preventDefault(); apply(); } }}
            className={cn("z-[1000] w-[320px] max-w-[calc(100vw-24px)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-3xl border border-border bg-popover p-5 text-popover-foreground shadow-2xl shadow-black/20 outline-none", menuClassName)}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p id={`${id}-title`} className="text-sm font-bold">Make time yours</p>
                <p className={cn("mt-1 text-xs", belowMin ? "text-red-500 font-semibold" : "text-muted-foreground")}>{belowMin ? "Past times are not allowed for today." : "Any hour. Every minute."}</p>
              </div>
              <div className="flex rounded-lg bg-muted p-1" aria-label="Time format">
                {[false, true].map((format) => (
                  <button key={String(format)} type="button" aria-pressed={use24Hour === format}
                    onClick={() => { loadTime(valid ? draft : selected ?? { hour: 9, minute: 0 }, format); setUse24Hour(format); }}
                    className={cn("rounded-md px-2 py-1.5 text-[10px] font-bold", focus, use24Hour === format ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                    {format ? "24H" : "12H"}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-brand-green/10 via-background to-brand-blue/10 p-4">
              <div className="flex items-start justify-center gap-2">
                {[{ label: "Hour", text: hour, set: setHour, min: use24Hour ? 0 : 1, max: use24Hour ? 23 : 12 }, { label: "Minute", text: minute, set: setMinute, min: 0, max: 59 }].map((part, index) => (
                  <React.Fragment key={part.label}>
                    {index === 1 && <span aria-hidden="true" className="pt-1 text-4xl font-light text-muted-foreground">:</span>}
                    <label className="min-w-0 flex-1 text-center">
                      <input type="number" inputMode="numeric" min={part.min} max={part.max} step={1} value={part.text}
                        aria-label={part.label} aria-describedby={!valid ? `${id}-error` : undefined}
                        onFocus={(event) => event.target.select()}
                        onChange={(event) => part.set(event.target.value)}
                        onBlur={() => { if (part.text !== "" && Number(part.text) >= part.min && Number(part.text) <= part.max) part.set(pad(Number(part.text))); }}
                        className={cn("h-14 w-full rounded-xl border border-transparent bg-background/80 text-center text-4xl font-semibold tabular-nums tracking-tight focus:border-brand-green/50", focus)} />
                      <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{part.label}</span>
                    </label>
                  </React.Fragment>
                ))}
                {!use24Hour && <div className="ml-1 flex flex-col gap-1">
                  {["AM", "PM"].map((item) => <button key={item} type="button" aria-pressed={period === item} onClick={() => setPeriod(item)}
                    className={cn("rounded-lg px-2 py-2 text-xs font-bold", focus, period === item ? active : "bg-background/70 text-muted-foreground")}>{item}</button>)}
                </div>}
              </div>
            </div>
            <div className="my-5">
              <p className="mb-2.5 text-xs font-medium text-muted-foreground">Minute shortcuts</p>
              <div className="grid grid-cols-4 gap-2">
                {[0, 15, 30, 45].map((item) => <button key={item} type="button" aria-label={`Set minute to ${pad(item)}`} aria-pressed={minute !== "" && Number(minute) === item}
                  onClick={() => setMinute(pad(item))}
                  className={cn("rounded-xl border border-border/60 py-2 text-sm font-semibold tabular-nums transition-colors", focus, minute !== "" && Number(minute) === item ? active : "hover:bg-accent")}>
                  :{pad(item)}
                </button>)}
              </div>
            </div>
            {!valid && <p id={`${id}-error`} role="status" className="mb-3 text-xs text-destructive">Enter an hour from {use24Hour ? "0–23" : "1–12"} and a minute from 0–59.</p>}
            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-4">
              <button type="button" onClick={() => setOpen(false)} className={cn("rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground hover:text-foreground", focus)}>Cancel</button>
              <button type="button" disabled={!valid} onClick={apply}
                className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold disabled:opacity-40", active, focus)}>
                {valid ? `Set ${displayTime(draft, use24Hour)}` : "Set time"}<ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
