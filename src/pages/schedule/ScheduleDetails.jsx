import React, { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  Clock3,
  Copy,
  Download,
  Link2,
  Mail,
  PencilLine,
  Settings,
  Trash2,
  UsersRound,
  Video,
} from "lucide-react";

import { cancelSchedule, getSchedules } from "../../api/scheduleApi";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../hooks/use-toast";

const fallbackMeeting = {
  id: "sess_1",
  title: "Weekly Engineering Sync",
  type: "meeting",
  date: "2024-05-04",
  fromtime: "19:00",
  totime: "20:00",
  timezone: "Africa/Lagos",
  description: "Discussing the latest updates on the frontend architecture.",
  roomname: "Product Standup",
  guest: "dev@konn3ct.io,design@konn3ct.io",
};

const parseMeetingDate = (value) => {
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

const formatTime = (value) => {
  if (!value) return "TBD";
  const text = String(value).trim();
  if (/[ap]m/i.test(text)) return text.replace(/\s+/g, " ").toUpperCase();

  const [hours, minutes = "00"] = text.split(":");
  const hourNumber = Number(hours);
  if (!Number.isFinite(hourNumber)) return text;

  const period = hourNumber >= 12 ? "PM" : "AM";
  const displayHour = hourNumber % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
};

const formatLongDate = (date) => {
  if (!date) return "Date TBD";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getInitials = (email) => {
  const name = String(email).split("@")[0] ?? "";
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts.slice(0, 2).map((part) => part[0]) : [name[0], name[1]];
  return letters.join("").toUpperCase() || "GU";
};

const normalizeGuestList = (value) =>
  Array.isArray(value)
    ? value.filter(Boolean)
    : String(value ?? "")
        .split(",")
        .map((guest) => guest.trim())
        .filter(Boolean);

const normalizeSchedule = (schedule) => {
  const source = schedule?.raw ?? schedule ?? fallbackMeeting;
  const date = parseMeetingDate(schedule?.date ?? source.date ?? source.start_date ?? source.scheduled_date);
  const guests = normalizeGuestList(schedule?.guestList ?? source.guest ?? source.guests);
  const type = String(schedule?.type ?? source.type ?? source.session_type ?? source.meeting_type ?? "meeting").toLowerCase();
  const id = schedule?.id ?? source.id ?? fallbackMeeting.id;
  const roomName =
    schedule?.roomName ??
    source.roomname ??
    source.room_name ??
    source.room ??
    fallbackMeeting.roomname;
  const joinLink =
    schedule?.joinLink ??
    source.join_link ??
    source.joinLink ??
    source.meeting_url ??
    source.url ??
    "";

  return {
    raw: source,
    id,
    roomId: source.room_id ?? source.roomId ?? source.room?.id ?? "",
    title: schedule?.title ?? source.title ?? source.roomname ?? fallbackMeeting.title,
    type: type.includes("webinar") ? "webinar" : "meeting",
    date,
    fromTime: schedule?.time ?? source.time ?? source.fromtime ?? fallbackMeeting.fromtime,
    toTime: schedule?.endTime ?? source.totime ?? source.endtime ?? source.end_time ?? fallbackMeeting.totime,
    timezone: schedule?.timezone ?? source.timezone ?? fallbackMeeting.timezone,
    recurrence: source.recurrence ?? schedule?.recurrence ?? "once",
    description: schedule?.description ?? source.description ?? fallbackMeeting.description,
    roomName,
    guests: guests.length > 0 ? guests : normalizeGuestList(fallbackMeeting.guest),
    joinLink,
  };
};

const getSchedulesArray = (data) => (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);

const buildJoinLink = (meeting) => {
  if (meeting.joinLink) return meeting.joinLink;

  const baseUrl = process.env.REACT_APP_BASE_BACKENED_URL || "https://konn3ct.io/";
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}join/${meeting.id}`;
};

const getIcsDate = (date, time) => {
  const meetingDate = new Date(date ?? new Date());
  const [hours = "00", minutes = "00"] = String(time ?? "00:00").split(":");
  meetingDate.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  return meetingDate
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
};

export default function ScheduleDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const stateMeeting = location.state?.meeting;

  const schedulesQuery = useQuery({
    queryKey: ["schedules"],
    queryFn: getSchedules,
    enabled: !stateMeeting,
  });

  const queriedMeeting = useMemo(() => {
    if (stateMeeting) return null;
    return getSchedulesArray(schedulesQuery.data).find((schedule) => String(schedule.id) === String(id));
  }, [id, schedulesQuery.data, stateMeeting]);

  const meeting = useMemo(
    () => normalizeSchedule(stateMeeting ?? queriedMeeting ?? fallbackMeeting),
    [queriedMeeting, stateMeeting]
  );

  const joinLink = buildJoinLink(meeting);
  const timeRange = `${formatTime(meeting.fromTime)} - ${formatTime(meeting.toTime)}`;

  const cancelScheduleMutation = useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({ description: "Session canceled successfully." });
      navigate("/schedule");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Unable to cancel session",
        description: "Please refresh and try again.",
      });
    },
  });

  const handleCopy = async (value, successMessage) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ description: successMessage });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to copy",
        description: "Please try again.",
      });
    }
  };

  const invitationText = `${meeting.title}\n${formatLongDate(meeting.date)}\n${timeRange} (${meeting.timezone})\nRoom: ${meeting.roomName}\nJoin: ${joinLink}`;

  const handleDownloadIcs = () => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Konn3ct//Schedule//EN",
      "BEGIN:VEVENT",
      `UID:${meeting.id}@konn3ct`,
      `SUMMARY:${meeting.title}`,
      `DESCRIPTION:${meeting.description}`,
      `LOCATION:${meeting.roomName}`,
      `DTSTART:${getIcsDate(meeting.date, meeting.fromTime)}`,
      `DTEND:${getIcsDate(meeting.date, meeting.toTime)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${meeting.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-calendar.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCancel = () => {
    const confirmed = window.confirm(`Cancel "${meeting.title}"?`);
    if (!confirmed) return;
    cancelScheduleMutation.mutate(meeting.id);
  };

  if (!stateMeeting && schedulesQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10 px-4 sm:px-6 lg:px-[33px]">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_360px]">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl pb-10 px-4 sm:px-6 lg:px-[33px] text-foreground animate-in fade-in duration-500">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => navigate("/schedule")}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
            aria-label="Back to schedule"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
                {meeting.title}
              </h1>
              <span className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-green">
                Upcoming
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Video className="h-4 w-4" />
                {meeting.type}
              </span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
              <span>Room: /{meeting.roomName.toLowerCase().replace(/\s+/g, "-")}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 md:pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/schedule/new", { state: { meeting } })}
            className="h-11 rounded-xl border-border/70 bg-surface px-5 text-sm font-bold shadow-none hover:bg-black/[0.03]"
          >
            <PencilLine className="h-4 w-4" />
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={cancelScheduleMutation.isPending}
            className="h-11 rounded-xl border-foreground bg-transparent px-5 text-sm font-bold shadow-none hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_360px]">
        <div className="flex flex-col gap-5">
          <Card className="rounded-2xl border-border/60 bg-surface p-0 shadow-[0_24px_55px_-35px_rgba(15,23,42,0.45)]">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-black/[0.01] p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-extrabold">{formatLongDate(meeting.date)}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2.5 text-sm font-semibold text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      {timeRange}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">({meeting.timezone})</span>
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-sm font-extrabold uppercase tracking-wider">Description</p>
                <p className="mt-3 text-sm leading-6 text-[#343030] dark:text-muted-foreground">
                  {meeting.description}
                </p>
              </div>

              <div className="my-6 h-px bg-border/70" />

              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Room</p>
                <p className="mt-1.5 text-base font-semibold">{meeting.roomName}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-2xl border-border/60 bg-surface p-0 shadow-[0_24px_55px_-35px_rgba(15,23,42,0.45)]">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-4 border-b border-border/70 px-5 py-4">
                <div className="flex items-center gap-3">
                  <UsersRound className="h-5 w-5 text-brand-blue" />
                  <h2 className="text-lg font-extrabold">Invited Participants</h2>
                </div>
                <p className="text-sm font-bold text-muted-foreground">{meeting.guests.length} total</p>
              </div>

              <div className="divide-y divide-border/50">
                {meeting.guests.map((guest) => (
                  <div key={guest} className="flex items-center justify-between gap-3 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-xs font-extrabold text-brand-green">
                        {getInitials(guest)}
                      </span>
                      <p className="truncate text-sm font-semibold">{guest}</p>
                    </div>
                    <span className="rounded-md bg-brand-green/10 px-2.5 py-1 text-xs font-extrabold text-brand-green">
                      Invited
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/60 p-4">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/schedule/new", { state: { meeting } })}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent text-sm font-semibold text-[#343030] transition-colors hover:bg-black/[0.03] dark:text-muted-foreground dark:hover:bg-white/[0.06]"
                >
                  <Mail className="h-4 w-4" />
                  Add more invites
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="rounded-2xl border-brand-green/30 bg-brand-green/5 p-0 shadow-[0_24px_55px_-35px_rgba(32,116,80,0.5)]">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-extrabold">Ready to join?</h2>
              <p className="mx-auto mt-3 max-w-[280px] text-sm leading-6 text-[#343030] dark:text-muted-foreground">
                Join the room early to prep, or start the session now.
              </p>
              <Button
                type="button"
                onClick={() => navigate("/join")}
                className="mt-5 h-12 w-full rounded-xl bg-brand-green text-base font-extrabold text-white shadow-lg shadow-brand-green/20 hover:bg-[#287854]"
              >
                <Video className="h-4 w-4" />
                Join Early
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-surface p-0 shadow-[0_24px_55px_-35px_rgba(15,23,42,0.45)]">
            <CardContent className="p-6">
              <h2 className="text-lg font-extrabold">Share & Add</h2>
              <div className="my-4 h-px bg-border/70" />

              <label className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">
                Join Link
              </label>
              <div className="mt-2 flex items-center gap-2">
                <div className="min-w-0 flex-1 rounded-xl border border-border bg-black/[0.02] px-3 py-2.5 text-sm text-[#343030] dark:text-muted-foreground">
                  <p className="truncate">{joinLink}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(joinLink, "Join link copied to clipboard.")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                  aria-label="Copy join link"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-transparent px-4 text-left text-sm font-semibold transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <Download className="h-4 w-4 text-brand-blue" />
                  Download ICS Calendar File
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(invitationText, "Invitation text copied to clipboard.")}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-transparent px-4 text-left text-sm font-semibold transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                >
                  <Link2 className="h-4 w-4" />
                  Copy Invitation Text
                </button>
              </div>
            </CardContent>
          </Card>

          <button
            type="button"
            className="flex items-center gap-2 px-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Room settings & defaults
          </button>
        </aside>
      </div>
    </div>
  );
}
