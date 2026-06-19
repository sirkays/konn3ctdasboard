import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Play,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import { cancelSchedule, getSchedules } from "../../api/scheduleApi";
import ToolTips from "../../components/ToolTips";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "../../components/ui/pagination";
import { Skeleton } from "../../components/ui/skeleton";
import { useToast } from "../../hooks/use-toast";

const WEEKDAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const SESSION_COLORS = ["bg-brand-green", "bg-brand-blue", "bg-amber-500", "bg-[#CC505C]"];

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

const formatMonthTitle = (date) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);

const formatDateLabel = (date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date).toUpperCase();

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

const splitFormattedTime = (value) => {
  const formatted = formatTime(value);
  const [time, period = ""] = formatted.split(" ");
  return { time, period };
};

const getMonday = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
};

const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const isSameDay = (firstDate, secondDate) =>
  firstDate?.getFullYear() === secondDate?.getFullYear() &&
  firstDate?.getMonth() === secondDate?.getMonth() &&
  firstDate?.getDate() === secondDate?.getDate();

const normalizeMeetings = (data) => {
  const meetings = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.data?.data)
        ? data.data.data
        : [];

  return meetings
    .map((meeting, index) => {
      const date = parseMeetingDate(meeting.date ?? meeting.start_date ?? meeting.scheduled_date);
      const guestList = String(meeting.guest ?? meeting.guests ?? "")
        .split(",")
        .map((guest) => guest.trim())
        .filter(Boolean);
      const registeredCount =
        meeting.registered ??
        meeting.registered_count ??
        meeting.registrations_count ??
        meeting.participant_count ??
        guestList.length;
      const type = String(meeting.type ?? meeting.session_type ?? meeting.meeting_type ?? "meeting").toLowerCase();

      return {
        id: meeting.id ?? `${meeting.title ?? meeting.roomname ?? "session"}-${index}`,
        title: meeting.title ?? meeting.roomname ?? "Scheduled Session",
        date,
        rawDate: meeting.date,
        time: meeting.time ?? meeting.fromtime,
        endTime: meeting.totime ?? meeting.endtime ?? meeting.end_time,
        timezone: meeting.timezone ?? "Africa/Lagos",
        description: meeting.description ?? "",
        roomName: meeting.roomname ?? meeting.room_name ?? meeting.room ?? "",
        guestList,
        joinLink:
          meeting.roomlink ??
          meeting.room_link ??
          meeting.join_link ??
          meeting.joinLink ??
          meeting.meeting_url ??
          meeting.url ??
          "",
        raw: meeting,
        type: type.includes("webinar") ? "WEBINAR" : "MEETING",
        attendeeLabel: type.includes("webinar")
          ? `${Number(registeredCount) || 0} Registered`
          : `${Number(registeredCount) || 0} Guests`,
      };
    })
    .filter((meeting) => meeting.date)
    .sort((first, second) => {
      const dateDiff = first.date - second.date;
      if (dateDiff !== 0) return dateDiff;
      return String(first.time ?? "").localeCompare(String(second.time ?? ""));
    });
};

const getSchedulePagination = (data, fallbackCount) => {
  const source = data?.data && !Array.isArray(data.data) ? data.data : data;
  const total = Number(source?.total);
  const lastPage = Number(source?.last_page);
  const current = Number(source?.current_page);

  return {
    total: Number.isFinite(total) ? total : fallbackCount,
    totalPages: Number.isFinite(lastPage) ? lastPage : 1,
    currentPage: Number.isFinite(current) ? current : 1,
  };
};

export default function Schedule() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const meetingsQuery = useQuery({
    queryKey: ["schedules", currentPage],
    queryFn: () => getSchedules({ page: currentPage }),
    keepPreviousData: true,
  });
  const meetings = useMemo(() => normalizeMeetings(meetingsQuery.data), [meetingsQuery.data]);
  const schedulePagination = useMemo(
    () => getSchedulePagination(meetingsQuery.data, meetings.length),
    [meetings.length, meetingsQuery.data]
  );

  const cancelScheduleMutation = useMutation({
    mutationFn: cancelSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast({ description: "Session canceled successfully." });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Unable to cancel session",
        description: "Please refresh and try again.",
      });
    },
  });

  useEffect(() => {
    if (meetings.length > 0) {
      setSelectedDate(meetings[0].date);
    }
  }, [meetings]);

  const handleCopyMeetingLink = async (meeting) => {
    if (!meeting?.joinLink) {
      toast({ description: "No meeting link available to copy." });
      return;
    }

    try {
      await navigator.clipboard.writeText(meeting.joinLink);
      toast({ description: "Meeting link copied to clipboard." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Unable to copy meeting link",
        description: "Please try again.",
      });
    }
  };

  const handleCancelSession = (meeting) => {
    if (!meeting?.id) return;

    const confirmed = window.confirm(`Cancel "${meeting.title}"?`);
    if (!confirmed) return;

    cancelScheduleMutation.mutate(meeting.id);
  };

  const handleJoinSession = (meeting) => {
    if (!meeting?.joinLink) {
      toast({
        variant: "destructive",
        title: "Join link unavailable",
        description: "This schedule does not include a room link yet.",
      });
      return;
    }

    window.location.assign(meeting.joinLink);
  };

  const weekStart = getMonday(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const totalPages = Math.max(1, schedulePagination.totalPages);
  const totalMeetings = schedulePagination.total;

  const hasSessionOnDate = (date) => meetings.some((meeting) => isSameDay(meeting.date, date));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  if (meetingsQuery.isLoading) {
    return (
      <div className="flex flex-col gap-8 pb-10">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-60 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10 px-4 sm:px-6 lg:px-[33px] animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Schedule
          </h1>
          <p className="mt-1 text-muted-foreground">
            Plan and manage your upcoming meetings and webinars.
          </p>
        </div>
        <Button
          className="h-11 w-full rounded-xl bg-brand-green px-5 font-bold text-white shadow-lg shadow-brand-green/20 hover:bg-[#287854] sm:w-auto"
          onClick={() => navigate("/dashboard/schedule/new")}
        >
          <Plus className="h-4 w-4" />
          Schedule Session
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-surface p-0 shadow-[0_24px_55px_-35px_rgba(15,23,42,0.45)]">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-brand-blue" />
              <h2 className="text-xl font-extrabold text-foreground">
                {formatMonthTitle(selectedDate)}
              </h2>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Button
                variant="outline"
                className="h-10 rounded-xl border-border/70 bg-surface px-4 text-sm font-bold hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7">
            {weekDays.map((day, index) => {
              const active = isSameDay(day, selectedDate);
              const hasSession = hasSessionOnDate(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`flex min-h-[110px] flex-col items-center justify-start gap-3 px-2 py-5 transition-colors ${
                    active
                      ? "bg-brand-green/10"
                      : "bg-surface hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-xs font-extrabold text-muted-foreground sm:text-sm">
                    {WEEKDAY_LABELS[index]}
                  </span>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold ${
                      active
                        ? "bg-brand-green text-white shadow-[0_8px_18px_rgba(32,116,80,0.28)]"
                        : "text-foreground"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      hasSession ? "bg-brand-green" : "bg-transparent"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold text-foreground">Upcoming Sessions</h2>
          <p className="text-base font-medium text-muted-foreground">{totalMeetings} total</p>
        </div>

        {meetingsQuery.isError ? (
          <Card className="rounded-2xl border-border/60 bg-surface">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Unable to load upcoming sessions. Please refresh and try again.
            </CardContent>
          </Card>
        ) : meetings.length === 0 ? (
          <Card className="rounded-2xl border-border/60 bg-surface">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <CalendarDays className="h-8 w-8 text-brand-green/60" />
              <p className="mt-3 text-base font-bold text-foreground">No upcoming sessions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Schedule a meeting or webinar to see it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-5">
            {meetings.map((meeting, index) => {
              const { time, period } = splitFormattedTime(meeting.time);
              const color = SESSION_COLORS[index % SESSION_COLORS.length];

              return (
                <Card
                  key={meeting.id}
                  className="group overflow-hidden rounded-2xl border-border/60 bg-surface p-0 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)]"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      <div className={`h-1.5 w-full sm:h-auto sm:w-1.5 ${color}`} />
                      <div className="flex w-full flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
                        <div className="flex w-full items-center gap-3 sm:w-28 sm:flex-col sm:gap-1.5 sm:text-center">
                          <span className="text-xl font-extrabold leading-none text-foreground">
                            {time}
                          </span>
                          <span className="text-xs font-extrabold text-muted-foreground">
                            {period}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground">
                            {formatDateLabel(meeting.date)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-extrabold text-foreground">
                            {meeting.title}
                          </h3>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-medium text-muted-foreground">
                            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-extrabold">
                              {meeting.type}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-foreground/70" />
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {meeting.timezone}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-foreground/70" />
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              {meeting.attendeeLabel}
                            </span>
                          </div>
                        </div>

                        <div className="pointer-events-none flex shrink-0 items-center justify-end gap-2 self-end opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 sm:self-center">
                          <ToolTips content="Copy meeting link">
                            <button
                              type="button"
                              onClick={() => handleCopyMeetingLink(meeting)}
                              disabled={!meeting.joinLink}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
                              aria-label="Copy meeting link"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </ToolTips>
                          <ToolTips content="View details">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(`/scheduleDetails/${encodeURIComponent(meeting.id)}`, {
                                  state: { meeting },
                                })
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
                              aria-label="View session detail"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </ToolTips>
                          <ToolTips content="Cancel session">
                            <button
                              type="button"
                              onClick={() => handleCancelSession(meeting)}
                              disabled={cancelScheduleMutation.isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Cancel session"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </ToolTips>
                          <ToolTips content="Join session">
                            <Button
                              type="button"
                              onClick={() => handleJoinSession(meeting)}
                              disabled={!meeting.joinLink}
                              className="h-10 rounded-xl bg-brand-green px-4 text-sm font-bold text-white shadow-lg shadow-brand-green/20 hover:bg-[#287854]"
                            >
                              <Play className="h-4 w-4" />
                              Join
                            </Button>
                          </ToolTips>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {totalPages > 1 && (
              <div className="flex items-center justify-center pt-1">
                <Pagination className="w-auto rounded-full border border-border/60 bg-surface px-2 py-1 shadow-sm">
                  <PaginationContent className="flex items-center space-x-1">
                    <PaginationItem>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous upcoming sessions page"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/[0.06]"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </PaginationItem>
                    <PaginationItem>
                      <span className="px-3 text-sm font-medium text-foreground">
                        {currentPage} <span className="font-normal text-muted-foreground">/ {totalPages}</span>
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next upcoming sessions page"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.04] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/[0.06]"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
