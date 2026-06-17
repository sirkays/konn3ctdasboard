import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, Calendar as CalendarIcon,
  Video, MonitorPlay, AlignLeft, Globe, Mail, X, Check, 
  ChevronLeft, ChevronRight, ChevronsUpDown 
} from "lucide-react";

import { getRooms } from "../../api/roomsApi";
import { createSchedule, getScheduleRecentEmails, updateSchedule } from "../../api/scheduleApi";
import { useToast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";

import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../components/ui/command";
import { Skeleton } from "../../components/ui/skeleton";

const formatScheduleDate = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseScheduleDate = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const stringValue = String(value);
  const dateOnlyMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
  }

  const date = new Date(stringValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeGuestEmails = (value = "") =>
  (Array.isArray(value) ? value : String(value).split(","))
    .map((email) => email.trim())
    .filter(Boolean)
    .join(",");

const hasValidGuestEmails = (value = "") => {
  const emails = normalizeGuestEmails(value).split(",").filter(Boolean);
  return emails.length > 0 && emails.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
};

const getScheduleErrorMessage = (source, fallbackMessage) => {
  const message = source?.response?.data?.message || source?.message || fallbackMessage;

  if (/unknown column ['`]?totime/i.test(message) || /SQLSTATE\[42S22\]/i.test(message)) {
    return "The schedule backend is misconfigured: it requires an end time, but the database is missing the totime column.";
  }

  return message;
};

const buildTimezoneOptions = () =>
  Intl.supportedValuesOf("timeZone").map((timezone) => {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, timeZoneName: "short" });
    const parts = formatter.formatToParts(date);
    const timezoneOffset = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    return { label: timezoneOffset ? `${timezone} (${timezoneOffset})` : timezone, value: timezone };
  });

const getScheduleGuestList = (meeting) =>
  normalizeGuestEmails(
    meeting?.guests ??
      meeting?.guestList ??
      meeting?.guest ??
      meeting?.raw?.guest ??
      meeting?.raw?.guests ??
      ""
  )
    .split(",")
    .filter(Boolean);

const getScheduleInitialValues = (meeting) => {
  const source = meeting?.raw ?? meeting ?? {};

  return {
    mode: String(meeting?.type ?? source.type ?? source.session_type ?? source.meeting_type ?? "meeting").toLowerCase().includes("webinar")
      ? "webinar"
      : "meeting",
    emails: getScheduleGuestList(meeting),
    formValues: {
      room_id: String(meeting?.roomId ?? source.room_id ?? source.roomId ?? source.room?.id ?? ""),
      title: meeting?.title ?? source.title ?? source.roomname ?? "",
      date: parseScheduleDate(meeting?.date ?? source.date ?? source.start_date ?? source.scheduled_date),
      fromtime: meeting?.fromTime ?? meeting?.time ?? source.fromtime ?? source.time ?? "",
      totime: meeting?.toTime ?? meeting?.endTime ?? source.totime ?? source.endtime ?? source.end_time ?? "",
      timezone: meeting?.timezone ?? source.timezone ?? "",
      recurrence: source.recurrence ?? meeting?.recurrence ?? "once",
      description: meeting?.description ?? source.description ?? "",
    },
  };
};

const normalizeRecentEmails = (data) => {
  const values = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.emails)
        ? data.emails
        : Array.isArray(data?.recent_emails)
          ? data.recent_emails
          : [];

  const emails = values.flatMap((item) => {
    if (typeof item === "string") return item.split(",");
    return [
      item?.email,
      item?.guest,
      item?.guests,
      item?.recipient,
      item?.value,
    ].filter(Boolean).flatMap((value) => String(value).split(","));
  });

  return [...new Set(emails.map((email) => email.trim()).filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))];
};

// --- Mini Calendar Helper ---
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const RECURRENCE_OPTIONS = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];
function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }

function CalendarPicker({ value, onChange, minDate }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(value?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value?.getMonth() ?? today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const isSelected = (day) => value?.getFullYear() === viewYear && value?.getMonth() === viewMonth && value?.getDate() === day;
  const isDisabled = (day) => {
    if (!minDate) return false;
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return d < min;
  };
  const isToday = (day) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={prevMonth} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-bold text-foreground">{MONTHS[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors text-muted-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const disabled = isDisabled(day);
          const selected = isSelected(day);
          const todayCell = isToday(day);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(new Date(viewYear, viewMonth, day))}
              className={`h-9 w-full rounded-lg text-sm font-medium transition-all
                ${disabled ? "text-muted-foreground/30 cursor-not-allowed" : "cursor-pointer"}
                ${selected ? "bg-brand-green text-white shadow-md shadow-brand-green/25" : todayCell && !disabled ? "border border-brand-green/40 text-brand-green font-bold hover:bg-brand-green/10" : !disabled ? "hover:bg-brand-green/10 text-foreground" : ""}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function NewSchedule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editingMeeting = location.state?.meeting ?? null;
  const isEditing = Boolean(editingMeeting?.id);
  const initialScheduleValues = useMemo(() => getScheduleInitialValues(editingMeeting), [editingMeeting]);

  const [mode, setMode] = useState(initialScheduleValues.mode);
  const [emails, setEmails] = useState(() => initialScheduleValues.emails);
  const [emailInput, setEmailInput] = useState("");
  const [roomOpen, setRoomOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  // Load Rooms
  const roomQuery = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const recentEmailsQuery = useQuery({
    queryKey: ["schedule-recent-emails"],
    queryFn: getScheduleRecentEmails,
    staleTime: 1000 * 60 * 5,
  });
  const timezones = useMemo(() => buildTimezoneOptions(), []);
  const recentEmailSuggestions = useMemo(
    () => normalizeRecentEmails(recentEmailsQuery.data).filter((email) => !emails.includes(email)),
    [emails, recentEmailsQuery.data]
  );

  const formSchema = z.object({
    room_id: z.string().trim().min(1, { message: "Room is required" }),
    title: z.string().trim().min(1, { message: "Title is required" }),
    date: z.date({ required_error: "Date is required" }).nullable().refine((val) => val instanceof Date && !Number.isNaN(val.getTime()), { message: "Invalid date" }),
    fromtime: z.string().trim().min(1, { message: "Start time is required" }),
    totime: z.string().trim().min(1, { message: "End time is required" }),
    timezone: z.string().trim().min(1, { message: "Timezone is required" }),
    recurrence: z.enum(["once", "daily", "weekly", "monthly"]),
    description: z.string().trim().min(1, { message: "Description is required" }),
  }).refine((data) => data.totime > data.fromtime, {
    message: "End time must be after start time",
    path: ["totime"],
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialScheduleValues.formValues,
  });

  const saveScheduleMutation = useMutation({
    mutationFn: (payload) => isEditing ? updateSchedule({ id: editingMeeting.id, data: payload }) : createSchedule(payload),
    onSuccess: (response) => {
      if (response?.success === false) {
        toast({ variant: "destructive", title: t("common.status.error"), description: getScheduleErrorMessage(response, "Failed to schedule") });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-recent-emails"] });
      toast({ description: response?.message || (isEditing ? "Session updated successfully!" : "Session scheduled successfully!") });
      navigate("/schedule");
    },
    onError: (error) => {
      toast({ variant: "destructive", title: t("common.status.error"), description: getScheduleErrorMessage(error, isEditing ? "Failed to update session" : "Failed to schedule") });
    },
  });

  const onSubmit = (data) => {
    if (emails.length === 0 && emailInput.trim() === '') {
      toast({ variant: "destructive", description: "Please add at least one guest" });
      return;
    }
    const guestEmails = [...emails];
    if (emailInput.trim() && !guestEmails.includes(emailInput.trim())) {
      guestEmails.push(emailInput.trim());
    }

    const guest = normalizeGuestEmails(guestEmails.join(","));
    if (!hasValidGuestEmails(guest)) {
      toast({ variant: "destructive", description: "Please enter valid guest email addresses" });
      return;
    }

    saveScheduleMutation.mutate({
      room_id: Number(data.room_id),
      title: data.title,
      description: data.description,
      recurrence: data.recurrence,
      date: formatScheduleDate(data.date),
      fromtime: data.fromtime,
      totime: data.totime,
      timezone: data.timezone,
      guest,
    });
  };

  const addEmail = (value) => {
    const newEmail = String(value).trim();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return;

    setEmails((previousEmails) =>
      previousEmails.includes(newEmail) ? previousEmails : [...previousEmails, newEmail]
    );
    setEmailInput("");
  };

  const handleAddEmail = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(emailInput);
    }
  };
  const removeEmail = (emailToRemove) => setEmails(emails.filter(e => e !== emailToRemove));

  const selectedDate = watch("date");
  if (!roomQuery.isSuccess) {
    return (
      <div className="flex flex-col gap-8 pb-10 max-w-4xl mx-auto w-full">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

  const rooms = roomQuery.data?.rooms || [];
  const selectedRoomId = watch("room_id");
  const selectedTimezone = watch("timezone");

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-10 w-10 shrink-0 bg-surface border border-border/50 hover:bg-black/[0.04]">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {isEditing ? "Edit Session" : "Schedule Session"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? "Update the meeting or webinar details." : "Set up a new meeting or webinar."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Mode Selection */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "meeting", icon: Video, label: "Meeting", desc: "Highly interactive, best for team syncs.", color: "brand-green" },
            { key: "webinar", icon: MonitorPlay, label: "Webinar", desc: "View-only attendees, best for broadcasts.", color: "brand-blue" },
          ].map(({ key, icon: Icon, label, desc, color }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all
                ${mode === key ? `border-${color} bg-${color}/5 shadow-sm` : "border-border/60 bg-surface hover:border-border hover:bg-black/[0.02]"}`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${mode === key ? `bg-${color} text-white` : "bg-black/5 text-muted-foreground"}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold ${mode === key ? `text-${color}` : "text-foreground"}`}>{label}</h3>
              <p className="text-sm text-muted-foreground text-center mt-1">{desc}</p>
              {mode === key && <div className={`absolute top-3 right-3 text-${color}`}><Check className="w-4 h-4" /></div>}
            </button>
          ))}
        </div>

        {/* Basic Details */}
        <Card className="rounded-2xl border-border/60 bg-surface overflow-hidden">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-lg font-bold text-foreground border-b border-border/40 pb-3">Basic Details</h3>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Session Title <span className="text-red-500">*</span></label>
              <Input {...register("title")} placeholder="e.g. Weekly Product Sync" className="h-11 bg-black/[0.02]" />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlignLeft className="w-4 h-4 text-muted-foreground" /> Description <span className="text-red-500">*</span>
              </label>
              <Textarea
                {...register("description")}
                rows={3}
                placeholder="What is this session about?"
                className="w-full rounded-xl bg-black/[0.02] p-3 text-sm text-foreground focus:ring-brand-green/50 resize-none"
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Link to Room <span className="text-red-500">*</span></label>
              <Popover open={roomOpen} onOpenChange={setRoomOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={roomOpen} className="w-full justify-between h-11 bg-black/[0.02] hover:bg-black/[0.04]">
                    {selectedRoomId ? rooms.find(r => String(r.id) === selectedRoomId)?.name : "Select an existing room..."}
                    <ChevronsUpDown className="ml-2 opacity-50 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search room..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No room found.</CommandEmpty>
                      <CommandGroup>
                        {rooms.map((room) => (
                          <CommandItem key={room.id} value={String(room.name ?? "").toLowerCase()} onSelect={() => { setValue("room_id", String(room.id)); setRoomOpen(false); }}>
                            {room.name}
                            <Check className={cn("ml-auto", selectedRoomId === String(room.id) ? "opacity-100" : "opacity-0")} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {errors.room_id && <p className="text-xs text-red-500">{errors.room_id.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card className="rounded-2xl border-border/60 bg-surface overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40">
              <CalendarIcon className="w-5 h-5 text-brand-green" />
              <h3 className="text-lg font-bold text-foreground">Date & Time</h3>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/40">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Date <span className="text-red-500">*</span></span>
                  {selectedDate && <span className="text-xs font-semibold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-md">{selectedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                </div>
                <CalendarPicker value={selectedDate} onChange={(d) => setValue("date", d)} minDate={new Date()} />
                {errors.date && <p className="text-xs text-red-500 mt-2">{errors.date.message}</p>}
              </div>

              <div className="p-6 space-y-6 flex flex-col justify-center">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Start Time <span className="text-red-500">*</span></span>
                    <Input type="time" {...register("fromtime")} className="h-14 text-xl font-bold text-center bg-black/[0.02]" />
                    {errors.fromtime && <p className="text-xs text-red-500 text-center">{errors.fromtime.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">End Time <span className="text-red-500">*</span></span>
                    <Input type="time" {...register("totime")} className="h-14 text-xl font-bold text-center bg-black/[0.02]" />
                    {errors.totime && <p className="text-xs text-red-500 text-center">{errors.totime.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-border/40 bg-black/[0.01] px-6 py-4 md:grid-cols-[1fr_220px]">
              <div className="flex items-center gap-4">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <label className="text-sm font-semibold text-foreground shrink-0">Timezone <span className="text-red-500">*</span></label>
                <div className="flex-1 max-w-xs">
                <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={timezoneOpen} className="w-full justify-between h-10 bg-surface">
                      {selectedTimezone ? timezones.find((tz) => tz.value === selectedTimezone)?.label : "Select Timezone"}
                      <ChevronsUpDown className="ml-2 opacity-50 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search timezone..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                          {timezones.map((tz) => (
                            <CommandItem key={tz.value} value={tz.value} onSelect={() => { setValue("timezone", tz.value); setTimezoneOpen(false); }}>
                              {tz.label}
                              <Check className={cn("ml-auto", selectedTimezone === tz.value ? "opacity-100" : "opacity-0")} />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.timezone && <p className="text-xs text-red-500 mt-1">{errors.timezone.message}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-foreground">Recurrence</label>
                <select
                  {...register("recurrence")}
                  className="h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  {RECURRENCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.recurrence && <p className="text-xs text-red-500">{errors.recurrence.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guests & Access */}
        <Card className="rounded-2xl border-border/60 bg-surface">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-lg font-bold text-foreground border-b border-border/40 pb-3">Guests & Access</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Guests
              </label>
              <div className="p-3 min-h-[90px] border border-border/60 rounded-xl bg-black/[0.02] flex flex-wrap gap-2 items-start focus-within:ring-2 focus-within:ring-brand-green/50 focus-within:bg-surface transition-all">
                {emails.map(email => (
                  <span key={email} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-green/10 text-brand-green text-xs font-semibold">
                    {email}
                    <button type="button" onClick={() => removeEmail(email)} className="hover:bg-brand-green/20 rounded-full p-0.5 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={handleAddEmail}
                  placeholder={emails.length === 0 ? "Type email and press Enter..." : ""}
                  className="flex-1 min-w-[200px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">Guests will receive the schedule details with the join link.</p>
              {recentEmailSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-muted-foreground">Recent:</span>
                  {recentEmailSuggestions.slice(0, 8).map((email) => (
                    <button
                      key={email}
                      type="button"
                      onClick={() => addEmail(email)}
                      className="rounded-full border border-border/60 bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-brand-green/40 hover:bg-brand-green/10 hover:text-brand-green"
                    >
                      {email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4 border-t border-border/60">
          <Button variant="outline" type="button" onClick={() => navigate(-1)} className="h-12 px-6 rounded-xl border-border/60">
            Cancel
          </Button>
          <Button type="submit" disabled={saveScheduleMutation.isPending} className="h-12 px-8 rounded-xl bg-brand-green hover:bg-[#287854] text-white font-bold shadow-lg shadow-brand-green/20">
            {saveScheduleMutation.isPending ? (isEditing ? "Updating..." : "Scheduling...") : (isEditing ? "Update Session" : "Schedule Session")}
          </Button>
        </div>
      </form>
    </div>
  );
}
