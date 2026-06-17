import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Users,
} from "lucide-react";

import { getMeetings } from "../api/roomsApi";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";

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
  const meetings = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

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
        time: meeting.time,
        timezone: meeting.timezone ?? "Africa/Lagos",
        type: type.includes("webinar") ? "WEBINAR" : "MEETING",
        attendeeLabel: type.includes("webinar")
          ? `${Number(registeredCount) || 0} Registered`
          : `${Number(registeredCount) || 0} Invited`,
      };
    })
    .filter((meeting) => meeting.date)
    .sort((first, second) => {
      const dateDiff = first.date - second.date;
      if (dateDiff !== 0) return dateDiff;
      return String(first.time ?? "").localeCompare(String(second.time ?? ""));
    });
};

export default function Schedule() {
  const navigate = useNavigate();
  const meetingsQuery = useQuery({ queryKey: ["meetings"], queryFn: getMeetings });
  const meetings = useMemo(() => normalizeMeetings(meetingsQuery.data), [meetingsQuery.data]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  useEffect(() => {
    if (meetings.length > 0) {
      setSelectedDate(meetings[0].date);
    }
  }, [meetings]);

  const weekStart = getMonday(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  const hasSessionOnDate = (date) => meetings.some((meeting) => isSameDay(meeting.date, date));

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
    <div className="flex flex-col gap-12 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Schedule
          </h1>
          <p className="mt-3 text-lg font-medium text-muted-foreground md:text-xl">
            Plan and manage your upcoming meetings and webinars.
          </p>
        </div>
        <Button
          className="h-14 w-full rounded-2xl bg-brand-green px-8 text-base font-bold text-white shadow-[0_14px_36px_rgba(32,116,80,0.25)] hover:bg-[#287854] md:w-auto"
          onClick={() => navigate("/dashboard/schedule/new")}
        >
          <Plus className="h-5 w-5" />
          Schedule Session
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-surface p-0 shadow-[0_24px_55px_-35px_rgba(15,23,42,0.45)]">
        <CardContent className="p-0">
          <div className="flex flex-col gap-5 border-b border-border/60 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-9">
            <div className="flex items-center gap-4">
              <CalendarDays className="h-7 w-7 text-brand-blue" />
              <h2 className="text-2xl font-extrabold text-foreground">
                {formatMonthTitle(selectedDate)}
              </h2>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <Button
                variant="outline"
                className="h-12 rounded-2xl border-border/70 bg-surface px-5 text-base font-bold hover:bg-black/[0.03] dark:hover:bg-white/[0.06]"
                onClick={() => setSelectedDate(new Date())}
              >
                Today
              </Button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"
                aria-label="Next week"
              >
                <ChevronRight className="h-5 w-5" />
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
                  className={`flex min-h-[148px] flex-col items-center justify-start gap-4 px-2 py-7 transition-colors ${
                    active
                      ? "bg-brand-green/10"
                      : "bg-surface hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="text-xs font-extrabold text-muted-foreground sm:text-sm">
                    {WEEKDAY_LABELS[index]}
                  </span>
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-extrabold ${
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

      <section className="flex flex-col gap-7">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-foreground">Upcoming Sessions</h2>
          <p className="text-lg font-medium text-muted-foreground">{meetings.length} total</p>
        </div>

        {meetingsQuery.isError ? (
          <Card className="rounded-2xl border-border/60 bg-surface">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Unable to load upcoming sessions. Please refresh and try again.
            </CardContent>
          </Card>
        ) : meetings.length === 0 ? (
          <Card className="rounded-2xl border-border/60 bg-surface">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarDays className="h-10 w-10 text-brand-green/60" />
              <p className="mt-4 text-lg font-bold text-foreground">No upcoming sessions</p>
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
                  className="overflow-hidden rounded-2xl border-border/60 bg-surface p-0 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.55)]"
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      <div className={`h-1.5 w-full sm:h-auto sm:w-1.5 ${color}`} />
                      <div className="flex w-full flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-8 md:p-8">
                        <div className="flex w-full items-center gap-4 sm:w-36 sm:flex-col sm:gap-2 sm:text-center">
                          <span className="text-2xl font-extrabold leading-none text-foreground">
                            {time}
                          </span>
                          <span className="text-sm font-extrabold text-muted-foreground">
                            {period}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground">
                            {formatDateLabel(meeting.date)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-xl font-extrabold text-foreground">
                            {meeting.title}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-base font-medium text-muted-foreground">
                            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-extrabold">
                              {meeting.type}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-foreground/70" />
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {meeting.timezone}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-foreground/70" />
                            <span className="inline-flex items-center gap-1.5">
                              <Users className="h-4 w-4" />
                              {meeting.attendeeLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
