import React, { useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft, Calendar as CalendarIcon,
  Video, MonitorPlay, AlignLeft, Globe, Mail, X, Check, 
  UploadCloud, Tag, DollarSign, Bell, User, FileText, Copy, ExternalLink
} from "lucide-react";

import { getRooms } from "../../api/roomsApi";
import { createSchedule, getScheduleRecentEmails, updateSchedule, createWebinarSchedule } from "../../api/scheduleApi";
import { useToast } from "../../hooks/use-toast";
import { buildEventRegistrationUrl } from "../../lib/externalLinks";
import { cn } from "../../lib/utils";

import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Skeleton } from "../../components/ui/skeleton";
import { ModernSelect, ModernTimeSelect } from "../../components/ui/modern-select";
import { BrandedCalendar, formatDateForInput } from "../../components/ui/branded-date-picker";

const formatScheduleDate = (date) => {
  return formatDateForInput(date);
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
  let message = source?.response?.data?.message || source?.data?.message || source?.message;

  if (Array.isArray(source?.error) && source.error.length > 0) {
    message = source.error.join(", ");
  } else if (Array.isArray(source?.response?.data?.error) && source.response.data.error.length > 0) {
    message = source.response.data.error.join(", ");
  } else if (Array.isArray(source?.errors) && source.errors.length > 0) {
    message = source.errors.join(", ");
  } else if (Array.isArray(source?.response?.data?.errors) && source.response.data.errors.length > 0) {
    message = source.response.data.errors.join(", ");
  }

  message = message || fallbackMessage;

  if (/unknown column ['`]?totime/i.test(message) || /SQLSTATE\[42S22\]/i.test(message)) {
    return "The schedule backend is misconfigured: it requires an end time, but the database is missing the totime column.";
  }

  return message;
};

const scrollToField = (fieldKey) => {
  setTimeout(() => {
    const elementMap = {
      title: "field-title",
      description: "field-description",
      room_id: "field-room_id",
      date: "field-date",
      fromtime: "field-fromtime",
      totime: "field-totime",
      timezone: "field-timezone",
      recurrence: "field-recurrence",
      guest: "field-guests",
      emails: "field-guests",
      host_name: "field-webinar-host",
      about: "field-webinar-about",
      reminder: "field-webinar-reminder",
      amount: "field-webinar-amount",
      logo: "field-webinar-logo",
    };

    const targetId = elementMap[fieldKey] || fieldKey;
    const el = document.getElementById(targetId) || document.querySelector(`[name="${fieldKey}"]`);

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = el.querySelector("input:not([type=hidden]), textarea, select, button, [tabindex='0']");
      if (focusable && typeof focusable.focus === "function") {
        focusable.focus({ preventScroll: true });
      }
      return;
    }

    const firstError = document.querySelector(".text-red-500, [aria-invalid='true']");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 50);
};

const getFieldKeyFromErrorMessage = (message = "") => {
  const text = String(message).toLowerCase();
  if (text.includes("description") || text.includes("additional")) return "description";
  if (text.includes("title")) return "title";
  if (text.includes("room")) return "room_id";
  if (text.includes("date") || text.includes("fromtime") || text.includes("time") || text.includes("overlap")) return "date";
  if (text.includes("timezone")) return "timezone";
  if (text.includes("recurrence")) return "recurrence";
  if (text.includes("email") || text.includes("guest")) return "guest";
  if (text.includes("host")) return "host_name";
  if (text.includes("about")) return "about";
  if (text.includes("reminder")) return "reminder";
  if (text.includes("amount") || text.includes("price") || text.includes("currency")) return "amount";
  return "title";
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

const getScheduleInitialValues = (meeting, defaultDate) => {
  const source = meeting?.raw ?? meeting ?? {};
  const parsedDate = parseScheduleDate(meeting?.date ?? source.date ?? source.start_date ?? source.scheduled_date) || (defaultDate instanceof Date && !Number.isNaN(defaultDate.getTime()) ? defaultDate : null);

  return {
    mode: String(
      meeting?.type ??
        source.shedule_type ??
        source.schedule_type ??
        source.type ??
        source.session_type ??
        source.meeting_type ??
        "meeting"
    ).toLowerCase().includes("webinar")
      ? "webinar"
      : "meeting",
    emails: getScheduleGuestList(meeting),
    formValues: {
      room_id: String(meeting?.roomId ?? source.room_id ?? source.roomId ?? source.room?.id ?? ""),
      title: meeting?.title ?? source.title ?? source.roomname ?? "",
      date: parsedDate,
      fromtime: meeting?.fromTime ?? meeting?.time ?? source.fromtime ?? source.time ?? "",
      totime: meeting?.toTime ?? meeting?.endTime ?? source.totime ?? source.endtime ?? source.end_time ?? "",
      timezone: meeting?.timezone ?? source.timezone ?? "",
      recurrence: source.recurrence ?? meeting?.recurrence ?? "once",
      description: meeting?.description ?? meeting?.additional ?? source.description ?? source.additional ?? "",
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

const RECURRENCE_OPTIONS = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

// --- Main Page ---
export default function NewSchedule() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const editingMeeting = location.state?.meeting ?? null;
  const passedDate = location.state?.date;
  const isEditing = Boolean(editingMeeting?.id);
  const initialScheduleValues = useMemo(() => {
    const parsedPassedDate = passedDate ? new Date(passedDate) : null;
    return getScheduleInitialValues(editingMeeting, parsedPassedDate);
  }, [editingMeeting, passedDate]);

  const [mode, setMode] = useState(initialScheduleValues.mode);
  const [emails, setEmails] = useState(() => initialScheduleValues.emails);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  // Webinar-specific state
  const [webinarData, setWebinarData] = useState({
    host_name: "",
    about: "",
    free: "1",
    currency: "NGN",
    amount: "",
    reminder: "",
    tags: "",
    public: "1",
  });
  const [webinarLogo, setWebinarLogo] = useState(null);
  const [webinarLogoError, setWebinarLogoError] = useState("");
  const [eventUrl, setEventUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleWebinarChange = (e) => {
    const { name, value } = e.target;
    setWebinarData((prev) => ({ ...prev, [name]: value }));
  };

  const handleWebinarFileChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setWebinarLogoError("");
    setWebinarLogo(file);
  };

  const handleWebinarFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0] ?? null;
    if (file) {
      setWebinarLogoError("");
      setWebinarLogo(file);
    }
  };

  // Load Rooms
  const roomQuery = useQuery({ queryKey: ["rooms"], queryFn: getRooms });
  const recentEmailsQuery = useQuery({
    queryKey: ["schedule-recent-emails"],
    queryFn: getScheduleRecentEmails,
    staleTime: 1000 * 60 * 5,
  });
  const timezones = useMemo(() => buildTimezoneOptions(), []);
  const rooms = useMemo(() => roomQuery.data?.rooms || [], [roomQuery.data?.rooms]);
  const roomOptions = useMemo(
    () => rooms.map((room) => ({ label: room.name, value: String(room.id) })),
    [rooms]
  );
  const recentEmailSuggestions = useMemo(
    () => normalizeRecentEmails(recentEmailsQuery.data).filter((email) => !emails.includes(email)),
    [emails, recentEmailsQuery.data]
  );

  const formSchema = useMemo(() => z.object({
    room_id: isEditing
      ? z.string().optional()
      : z.string().trim().min(1, { message: "Room is required" }),
    title: z.string().trim()
      .min(1, { message: "Title is required" })
      .max(255, { message: "Title cannot exceed 255 characters" }),
    date: z
      .date({ required_error: "Date is required" })
      .nullable()
      .refine((val) => val instanceof Date && !Number.isNaN(val.getTime()), { message: "Invalid date" })
      .refine(
        (val) => {
          if (!(val instanceof Date) || Number.isNaN(val.getTime())) return false;
          const selectedDay = new Date(val);
          selectedDay.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return selectedDay >= today;
        },
        { message: "Previous dates are not accepted" }
      ),
    fromtime: z.string().trim().min(1, { message: "Start time is required" }),
    totime: z.string().trim().min(1, { message: "End time is required" }),
    timezone: z.string().trim().min(1, { message: "Timezone is required" }),
    recurrence: z.enum(["once", "daily", "weekly", "monthly"]),
    description: z.string().trim()
      .min(1, { message: "Description is required" })
      .max(200, { message: "Description cannot exceed 200 characters" }),
  }).refine((data) => data.totime > data.fromtime, {
    message: "End time must be after start time",
    path: ["totime"],
  }), [isEditing]);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    mode: "onChange",
    resolver: zodResolver(formSchema),
    defaultValues: initialScheduleValues.formValues,
  });

  const saveScheduleMutation = useMutation({
    mutationFn: (payload) => isEditing ? updateSchedule({ id: editingMeeting.id, data: payload }) : createSchedule(payload),
    onSuccess: (response) => {
      const isFailed = response?.success === false || response?.status === false || response?.status === "error" || Boolean(response?.error) || Boolean(response?.errors);
      if (isFailed) {
        const errMsg = getScheduleErrorMessage(response, "Failed to schedule");
        toast({ variant: "destructive", title: t("common.status.error"), description: errMsg });
        scrollToField(getFieldKeyFromErrorMessage(errMsg));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-recent-emails"] });
      toast({ description: response?.message || (isEditing ? "Session updated successfully!" : "Session scheduled successfully!") });
      navigate("/schedule");
    },
    onError: (error) => {
      const errMsg = getScheduleErrorMessage(error, isEditing ? "Failed to update session" : "Failed to schedule");
      toast({ variant: "destructive", title: t("common.status.error"), description: errMsg });
      scrollToField(getFieldKeyFromErrorMessage(errMsg));
    },
  });

  const saveWebinarMutation = useMutation({
    mutationFn: ({ schedulePayload, preRegFormData }) => createWebinarSchedule(schedulePayload, preRegFormData),
    onSuccess: (response) => {
      const isFailed = response?.success === false || response?.status === false || response?.status === "error" || Boolean(response?.error) || Boolean(response?.errors);
      if (isFailed) {
        const errMsg = getScheduleErrorMessage(response, "Failed to schedule webinar");
        toast({ variant: "destructive", title: t("common.status.error"), description: errMsg });
        scrollToField(getFieldKeyFromErrorMessage(errMsg));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["schedule-recent-emails"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });

      const ref = response?.eventReference;
      if (ref) {
        setEventUrl(buildEventRegistrationUrl(ref));
        toast({ description: "Webinar scheduled and event page created!" });
        scrollToField("event-success-card");
      } else {
        toast({ description: response?.message || "Webinar scheduled successfully!" });
        navigate("/schedule");
      }
    },
    onError: (error) => {
      const errMsg = getScheduleErrorMessage(error, "Failed to schedule webinar");
      toast({ variant: "destructive", title: t("common.status.error"), description: errMsg });
      scrollToField(getFieldKeyFromErrorMessage(errMsg));
    },
  });

  const onInvalid = (formErrors) => {
    const fieldOrder = [
      "title",
      "description",
      "room_id",
      "date",
      "fromtime",
      "totime",
      "timezone",
      "recurrence",
    ];

    for (const field of fieldOrder) {
      if (formErrors[field]) {
        scrollToField(field);
        return;
      }
    }

    const firstKey = Object.keys(formErrors)[0];
    if (firstKey) {
      scrollToField(firstKey);
    }
  };

  const onSubmit = (data) => {
    let guestEmails = [...emails];
    if (emailInput.trim()) {
      const raw = emailInput.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        setEmailError("Please enter a valid guest email address");
        toast({ variant: "destructive", description: "Please enter a valid guest email address" });
        scrollToField("guest");
        return;
      }
      if (!guestEmails.includes(raw.toLowerCase())) {
        guestEmails.push(raw.toLowerCase());
      }
    }

    if (guestEmails.length === 0) {
      setEmailError("Please add at least one guest email");
      toast({ variant: "destructive", description: "Please add at least one guest email" });
      scrollToField("guest");
      return;
    }

    const guest = normalizeGuestEmails(guestEmails.join(","));
    if (!hasValidGuestEmails(guest)) {
      setEmailError("Please enter valid guest email addresses");
      toast({ variant: "destructive", description: "Please enter valid guest email addresses" });
      scrollToField("guest");
      return;
    }

    setEmailError("");

    const schedulePayload = {
      title: data.title,
      description: data.description,
      recurrence: data.recurrence,
      date: formatScheduleDate(data.date),
      fromtime: data.fromtime,
      totime: data.totime,
      timezone: data.timezone,
      guest,
      shedule_type: mode,
    };

    if (!isEditing) {
      schedulePayload.room_id = Number(data.room_id);
    }

    if (mode === "webinar" && !isEditing) {
      // Validate webinar-specific fields
      if (!webinarData.host_name.trim()) {
        toast({ variant: "destructive", description: "Host name is required for webinars" });
        scrollToField("host_name");
        return;
      }
      if (!webinarData.about.trim()) {
        toast({ variant: "destructive", description: "Event description is required for webinars" });
        scrollToField("about");
        return;
      }
      if (!webinarData.reminder) {
        toast({ variant: "destructive", description: "Please select a reminder option" });
        scrollToField("reminder");
        return;
      }
      if (webinarData.free === "0" && (!webinarData.amount || Number(webinarData.amount) < 1)) {
        toast({ variant: "destructive", description: "A valid ticket price is required for paid events" });
        scrollToField("amount");
        return;
      }

      // Build FormData for pre-reg event
      const preRegFormData = new FormData();
      preRegFormData.append("title", data.title);
      preRegFormData.append("hostname", webinarData.host_name);
      preRegFormData.append("room_id", data.room_id);
      preRegFormData.append("date", formatScheduleDate(data.date));
      preRegFormData.append("time", data.fromtime);
      preRegFormData.append("timezone", data.timezone);
      preRegFormData.append("about", webinarData.about);
      preRegFormData.append("reminder", webinarData.reminder);
      preRegFormData.append("public", webinarData.public);
      preRegFormData.append("free", webinarData.free);
      preRegFormData.append("currency", webinarData.currency);
      preRegFormData.append("amount", webinarData.free === "1" ? "0" : webinarData.amount);
      if (webinarData.tags.trim()) {
        preRegFormData.append("tags", webinarData.tags.trim());
      }
      if (webinarLogo) {
        preRegFormData.append("logo", webinarLogo);
      }

      saveWebinarMutation.mutate({ schedulePayload, preRegFormData });
    } else {
      saveScheduleMutation.mutate(schedulePayload);
    }
  };

  const addEmail = (value) => {
    const raw = String(value).trim();
    if (!raw) return;

    // Split candidates by comma, semicolon, or whitespace
    const candidates = raw.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
    const validEmails = [];
    const invalidEmails = [];

    for (const candidate of candidates) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) {
        validEmails.push(candidate.toLowerCase());
      } else {
        invalidEmails.push(candidate);
      }
    }

    if (invalidEmails.length > 0) {
      setEmailError(`Invalid email address: ${invalidEmails.join(", ")}`);
    } else {
      setEmailError("");
    }

    if (validEmails.length > 0) {
      setEmails((prev) => {
        const unique = new Set([...prev, ...validEmails]);
        return Array.from(unique);
      });
      setEmailInput("");
    }
  };

  const handleAddEmail = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (emailInput.trim()) {
        e.preventDefault();
        addEmail(emailInput);
      }
    }
  };

  const removeEmail = (emailToRemove) => {
    setEmails((prev) => prev.filter((e) => e !== emailToRemove));
    setEmailError("");
  };

  const selectedDate = watch("date");
  if (!roomQuery.isSuccess) {
    return (
      <div className="flex flex-col gap-8 pb-10 max-w-4xl mx-auto w-full">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
      </div>
    );
  }

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

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
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

            <div id="field-title" className="space-y-2 scroll-mt-24">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Session Title <span className="text-red-500">*</span></label>
                <span className={cn("text-xs transition-colors", (watch("title") || "").length > 255 ? "text-red-500 font-bold" : "text-muted-foreground")}>
                  {(watch("title") || "").length}/255
                </span>
              </div>
              <Input
                {...register("title")}
                placeholder="e.g. Weekly Product Sync"
                className={cn("h-11 bg-black/[0.02]", errors.title && "border-red-500 focus-visible:ring-red-500/30")}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div id="field-description" className="space-y-2 scroll-mt-24">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-muted-foreground" /> Description <span className="text-red-500">*</span>
                </label>
                <span className={cn("text-xs transition-colors", (watch("description") || "").length > 200 ? "text-red-500 font-bold" : "text-muted-foreground")}>
                  {(watch("description") || "").length}/200
                </span>
              </div>
              <Textarea
                {...register("description")}
                rows={3}
                placeholder="What is this session about? (max 200 characters)"
                className={cn(
                  "w-full rounded-xl bg-black/[0.02] p-3 text-sm text-foreground focus:ring-brand-green/50 resize-none",
                  errors.description && "border-red-500 focus:ring-red-500/30"
                )}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>

            {!isEditing && (
              <div id="field-room_id" className="space-y-2 scroll-mt-24">
                <label className="text-sm font-semibold text-foreground">Link to Room <span className="text-red-500">*</span></label>
                <ModernSelect
                  value={selectedRoomId}
                  onValueChange={(value) => setValue("room_id", value, { shouldValidate: true })}
                  options={roomOptions}
                  placeholder="Select an existing room..."
                  searchPlaceholder="Search room..."
                  emptyText="No room found."
                  searchable
                  invalid={Boolean(errors.room_id)}
                />
                {errors.room_id && <p className="text-xs text-red-500">{errors.room_id.message}</p>}
              </div>
            )}
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
              <div id="field-date" className="p-6 space-y-4 scroll-mt-24">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Date <span className="text-red-500">*</span></span>
                  {selectedDate && <span className="text-xs font-semibold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-md">{selectedDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>}
                </div>
                <BrandedCalendar
                  value={selectedDate}
                  onChange={(d) => setValue("date", d, { shouldValidate: true })}
                  minDate={new Date()}
                  className="max-w-none"
                />
                {errors.date && <p className="text-xs text-red-500 mt-2">{errors.date.message}</p>}
              </div>

              <div className="p-6 space-y-6 flex flex-col justify-center">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div id="field-fromtime" className="space-y-2 scroll-mt-24">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Start Time <span className="text-red-500">*</span></span>
                    <ModernTimeSelect
                      value={watch("fromtime")}
                      aria-label="Start time"
                      onValueChange={(value) => setValue("fromtime", value, { shouldValidate: true })}
                      placeholder="--:-- --"
                      invalid={Boolean(errors.fromtime)}
                      triggerClassName="h-14 justify-center text-xl font-bold"
                    />
                    {errors.fromtime && <p className="text-xs text-red-500 text-center">{errors.fromtime.message}</p>}
                  </div>
                  <div id="field-totime" className="space-y-2 scroll-mt-24">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">End Time <span className="text-red-500">*</span></span>
                    <ModernTimeSelect
                      value={watch("totime")}
                      aria-label="End time"
                      onValueChange={(value) => setValue("totime", value, { shouldValidate: true })}
                      placeholder="--:-- --"
                      invalid={Boolean(errors.totime)}
                      triggerClassName="h-14 justify-center text-xl font-bold"
                    />
                    {errors.totime && <p className="text-xs text-red-500 text-center">{errors.totime.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-border/40 bg-black/[0.01] px-6 py-4 md:grid-cols-[1fr_220px]">
              <div id="field-timezone" className="flex items-center gap-4 scroll-mt-24">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <label className="text-sm font-semibold text-foreground shrink-0">Timezone <span className="text-red-500">*</span></label>
                <div className="flex-1 max-w-xs">
                  <ModernSelect
                    value={selectedTimezone}
                    onValueChange={(value) => setValue("timezone", value, { shouldValidate: true })}
                    options={timezones}
                    placeholder="Select Timezone"
                    searchPlaceholder="Search timezone..."
                    emptyText="No timezone found."
                    searchable
                    invalid={Boolean(errors.timezone)}
                    triggerClassName="h-10 bg-surface"
                    menuClassName="min-w-[300px]"
                    maxMenuHeight="18rem"
                  />
                  {errors.timezone && <p className="text-xs text-red-500 mt-1">{errors.timezone.message}</p>}
                </div>
              </div>
              <div id="field-recurrence" className="space-y-1 scroll-mt-24">
                <label className="text-sm font-semibold text-foreground">Recurrence</label>
                <ModernSelect
                  value={watch("recurrence")}
                  onValueChange={(value) => setValue("recurrence", value, { shouldValidate: true })}
                  options={RECURRENCE_OPTIONS}
                  invalid={Boolean(errors.recurrence)}
                  triggerClassName="h-10 bg-surface rounded-lg"
                  maxMenuHeight="12rem"
                />
                {errors.recurrence && <p className="text-xs text-red-500">{errors.recurrence.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guests & Access */}
        <Card id="field-guests" className="rounded-2xl border-border/60 bg-surface scroll-mt-24">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-lg font-bold text-foreground border-b border-border/40 pb-3">Guests & Access</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> Guests <span className="text-red-500">*</span>
              </label>
              <div className={cn(
                "p-3 min-h-[90px] border rounded-xl bg-black/[0.02] flex flex-wrap gap-2 items-start focus-within:ring-2 focus-within:ring-brand-green/50 focus-within:bg-surface transition-all",
                emailError ? "border-red-500 focus-within:ring-red-500/30" : "border-border/60"
              )}>
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
                  onChange={e => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  onKeyDown={handleAddEmail}
                  onBlur={() => {
                    if (emailInput.trim()) {
                      addEmail(emailInput);
                    }
                  }}
                  placeholder={emails.length === 0 ? "Type email and press Enter..." : "Add another guest..."}
                  className="flex-1 min-w-[200px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
                />
              </div>
              {emailError && <p className="text-xs text-red-500 font-medium">{emailError}</p>}
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

        {/* Webinar Event Registration — only shown for webinar mode when creating */}
        {mode === "webinar" && !isEditing && (
          <Card className="rounded-2xl border-brand-blue/30 bg-surface overflow-hidden">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-border/40 pb-3">
                <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand-blue" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Event Registration Page</h3>
                  <p className="text-xs text-muted-foreground">A public registration page will be created for your webinar.</p>
                </div>
              </div>

              {/* Host Name & About */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div id="field-webinar-host" className="space-y-2 scroll-mt-24">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Host Name <span className="text-red-500">*</span>
                    </Label>
                    <span className={cn("text-xs transition-colors", (webinarData.host_name || "").length > 255 ? "text-red-500 font-bold" : "text-muted-foreground")}>
                      {(webinarData.host_name || "").length}/255
                    </span>
                  </div>
                  <Input
                    type="text"
                    name="host_name"
                    value={webinarData.host_name}
                    onChange={handleWebinarChange}
                    placeholder="Your name or organisation"
                    className={cn(
                      "h-11 rounded-xl bg-black/[0.02] border-border/60 focus-visible:ring-brand-blue/30",
                      (webinarData.host_name || "").length > 255 && "border-red-500"
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Public Listing
                  </Label>
                  <ModernSelect
                    name="public"
                    value={webinarData.public}
                    onValueChange={(value) => setWebinarData((prev) => ({ ...prev, public: value }))}
                    options={[
                      { value: "1", label: "Public - Listed in event directory" },
                      { value: "0", label: "Private - Only accessible via link" },
                    ]}
                    accent="blue"
                  />
                </div>
              </div>

              <div id="field-webinar-about" className="space-y-2 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <AlignLeft className="h-4 w-4 text-muted-foreground" />
                    About the Event <span className="text-red-500">*</span>
                  </Label>
                </div>
                <Textarea
                  name="about"
                  rows={4}
                  value={webinarData.about}
                  onChange={handleWebinarChange}
                  placeholder="Describe what your webinar is about, the agenda, and what attendees will learn..."
                  className="w-full rounded-xl bg-black/[0.02] p-3 text-sm text-foreground border-border/60 focus-visible:ring-brand-blue/30 resize-none"
                />
              </div>

              {/* Ticketing & Reminders */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    Event Type
                  </Label>
                  <ModernSelect
                    name="free"
                    value={webinarData.free}
                    onValueChange={(value) => setWebinarData((prev) => ({ ...prev, free: value }))}
                    options={[
                      { value: "1", label: "Free" },
                      { value: "0", label: "Paid" },
                    ]}
                    accent="blue"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Currency</Label>
                  <ModernSelect
                    name="currency"
                    value={webinarData.currency}
                    onValueChange={(value) => setWebinarData((prev) => ({ ...prev, currency: value }))}
                    options={["NGN", "USD"]}
                    disabled={webinarData.free === "1"}
                    accent="blue"
                  />
                </div>

                <div id="field-webinar-amount" className="space-y-2 scroll-mt-24">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Ticket Price
                  </Label>
                  <Input
                    type="number"
                    name="amount"
                    value={webinarData.amount}
                    onChange={handleWebinarChange}
                    disabled={webinarData.free === "1"}
                    placeholder={webinarData.free === "1" ? "Free" : "0.00"}
                    className="h-11 rounded-xl bg-black/[0.02] border-border/60 focus-visible:ring-brand-blue/30 disabled:opacity-50"
                  />
                </div>

                <div id="field-webinar-reminder" className="space-y-2 scroll-mt-24">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Auto-Reminder <span className="text-red-500">*</span>
                  </Label>
                  <ModernSelect
                    name="reminder"
                    value={webinarData.reminder}
                    onValueChange={(value) => setWebinarData((prev) => ({ ...prev, reminder: value }))}
                    options={[
                      { value: "2", label: "2 Days before" },
                      { value: "1", label: "1 Day before" },
                    ]}
                    placeholder="Select Reminder"
                    accent="blue"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Tags
                </Label>
                <Input
                  type="text"
                  name="tags"
                  value={webinarData.tags}
                  onChange={handleWebinarChange}
                  placeholder="e.g. technology, webinar, product-launch (comma-separated)"
                  className="h-11 rounded-xl bg-black/[0.02] border-border/60 focus-visible:ring-brand-blue/30"
                />
                <p className="text-xs text-muted-foreground">Comma-separated tags to help attendees discover your event.</p>
              </div>

              {/* Logo Upload */}
              <div id="field-webinar-logo" className="space-y-2 scroll-mt-24">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  Event Banner / Logo
                </Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleWebinarFileDrop}
                  className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
                    webinarLogoError
                      ? "border-red-400 bg-red-50/50"
                      : "border-border/60 bg-black/[0.02] hover:border-brand-blue/50 hover:bg-black/[0.04]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={handleWebinarFileChange}
                  />
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="h-5 w-5 text-brand-blue" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Click to upload or drag and drop</span>
                  <span className="text-xs text-muted-foreground mt-1">PNG, JPG or JPEG (max 5MB)</span>

                  {webinarLogo && (
                    <div className="absolute inset-0 bg-surface/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl p-4">
                      <div className="h-10 w-10 rounded-full bg-brand-blue/10 flex items-center justify-center mb-2">
                        <UploadCloud className="h-5 w-5 text-brand-blue" />
                      </div>
                      <p className="text-sm font-bold text-foreground truncate max-w-full">{webinarLogo.name}</p>
                      <p className="text-xs text-brand-blue mt-1 font-medium">Click or drag to replace</p>
                    </div>
                  )}
                </div>
                {webinarLogoError && <p className="text-xs font-semibold text-red-500">{webinarLogoError}</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Event URL Success Card */}
        {eventUrl && (
          <Card id="event-success-card" className="rounded-2xl border-brand-green/40 bg-brand-green/5 overflow-hidden scroll-mt-24">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-brand-green" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Event Registration Page Created!</h3>
                    <p className="text-sm text-muted-foreground mt-1">Share this link with attendees so they can register for your webinar.</p>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-surface rounded-xl border border-border/60">
                    <ExternalLink className="w-4 h-4 text-brand-green shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate flex-1">{eventUrl}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-8 px-3 rounded-lg border-brand-green/30 text-brand-green hover:bg-brand-green/10"
                      onClick={() => {
                        navigator.clipboard.writeText(eventUrl);
                        toast({ description: "Event URL copied to clipboard!" });
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1.5" />
                      Copy
                    </Button>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => navigate("/schedule")}>
                      Go to Schedules
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => navigate("/events")}>
                      Go to Events
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        {!eventUrl && (
          <div className="flex justify-end gap-4 pt-4 border-t border-border/60">
            <Button variant="outline" type="button" onClick={() => navigate(-1)} className="h-12 px-6 rounded-xl border-border/60">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saveScheduleMutation.isPending || saveWebinarMutation.isPending}
              className="main-action-button h-12 px-8 rounded-xl font-bold"
            >
              {(saveScheduleMutation.isPending || saveWebinarMutation.isPending)
                ? (isEditing ? "Updating..." : mode === "webinar" ? "Creating Webinar..." : "Scheduling...")
                : (isEditing ? "Update Session" : mode === "webinar" ? "Schedule Webinar" : "Schedule Meeting")}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
