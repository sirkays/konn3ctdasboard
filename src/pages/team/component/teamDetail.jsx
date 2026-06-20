import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Clock, Mail, Play, Video } from "lucide-react";

import {
  fetchTeamMemberProfile,
  fetchTeamMemberRecordings,
  fetchTeamMemberRooms,
  fetchTeamMemberSessions,
} from "../../../api/teamApi";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../../components/ui/dialog";
import { cn } from "../../../lib/utils";

const roleStyles = {
  member: "bg-brand-green/10 text-brand-green",
  owner: "bg-orange-500/10 text-orange-500",
  admin: "bg-brand-blue/10 text-brand-blue",
};

const statusStyles = {
  active: "text-brand-green",
  pending: "text-orange-500",
};

const activityItems = [
  {
    title: "Rooms Created",
    action: "View All",
    panel: "rooms",
    icon: Video,
    iconClassName: "bg-brand-blue/10 text-brand-blue",
  },
  {
    title: "Recordings",
    action: "Manage",
    panel: "recordings",
    icon: Play,
    iconClassName: "bg-brand-green/10 text-brand-green",
  },
  {
    title: "Meetings Hosted",
    action: "View Logs",
    panel: "meetings",
    icon: CalendarDays,
    iconClassName: "bg-orange-500/10 text-orange-500",
  },
];

const detailPanels = {
  rooms: {
    key: "rooms",
    title: "Active Rooms",
    icon: Video,
    iconClassName: "bg-brand-blue/10 text-brand-blue",
    queryFn: fetchTeamMemberRooms,
  },
  recordings: {
    key: "recordings",
    title: "Recordings",
    icon: Play,
    iconClassName: "bg-brand-green/10 text-brand-green",
    queryFn: fetchTeamMemberRecordings,
  },
  meetings: {
    key: "sessions",
    title: "Meetings Hosted",
    icon: Clock,
    iconClassName: "bg-orange-500/10 text-orange-500",
    queryFn: fetchTeamMemberSessions,
  },
};

const getPossibleArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.rooms)) return response.data.rooms;
  if (Array.isArray(response?.data?.recordings)) return response.data.recordings;
  if (Array.isArray(response?.data?.sessions)) return response.data.sessions;
  if (Array.isArray(response?.data?.meetings)) return response.data.meetings;
  if (Array.isArray(response?.rooms)) return response.rooms;
  if (Array.isArray(response?.recordings)) return response.recordings;
  if (Array.isArray(response?.sessions)) return response.sessions;
  if (Array.isArray(response?.meetings)) return response.meetings;
  return [];
};

const getPayload = (response) => response?.data?.data || response?.data || response?.profile || response || {};

const read = (source, keys, fallback = undefined) => {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : undefined;
};

const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const readResponseNumber = (response, keys) => {
  const payload = getPayload(response);
  return toNumber(read(payload, keys));
};

const getResponseCount = (response, keys = []) => {
  const explicitCount = readResponseNumber(response, keys);
  if (explicitCount !== undefined) return explicitCount;
  return getPossibleArray(response).length;
};

const getValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatRelativeDate = (value) => {
  const date = getValidDate(value);
  if (!date) return "";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000);

  if (dayDiff === 0) return "today";
  if (dayDiff === 1) return "1 day ago";
  if (dayDiff > 1 && dayDiff < 30) return `${dayDiff} days ago`;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const getLatestDateValue = (items) => {
  const timestamps = items
    .map((item) =>
      getValidDate(
        read(item, [
          "last_hosted_at",
          "hosted_at",
          "started_at",
          "start_time",
          "date",
          "created_at",
        ])
      )
    )
    .filter(Boolean)
    .map((date) => date.getTime());

  if (!timestamps.length) return "";
  return new Date(Math.max(...timestamps)).toISOString();
};

const parseDurationHours = (value, unit = "auto") => {
  if (value === undefined || value === null || value === "") return 0;
  const raw = String(value).trim().toLowerCase();

  if (raw.includes(":")) {
    const parts = raw.split(":").map((part) => Number(part));
    if (parts.every((part) => Number.isFinite(part))) {
      if (parts.length === 3) return parts[0] + parts[1] / 60 + parts[2] / 3600;
      if (parts.length === 2) return parts[0] / 60 + parts[1] / 3600;
    }
  }

  const number = toNumber(raw);
  if (number === undefined) return 0;
  if (unit === "seconds" || raw.includes("sec")) return number / 3600;
  if (unit === "minutes" || raw.includes("min")) return number / 60;
  if (unit === "hours" || raw.includes("hour") || raw.includes("hr")) return number;
  return number;
};

const getRecordingHours = (response) => {
  const explicitHours = readResponseNumber(response, [
    "total_hours",
    "totalHours",
    "recording_hours",
    "recordings_hours",
    "hours",
  ]);
  if (explicitHours !== undefined) return explicitHours;

  const items = getPossibleArray(response);
  return items.reduce((total, item) => {
    const hours = read(item, ["duration_hours", "hours"]);
    if (hours !== undefined) return total + parseDurationHours(hours, "hours");

    const minutes = read(item, ["duration_minutes", "minutes"]);
    if (minutes !== undefined) return total + parseDurationHours(minutes, "minutes");

    const seconds = read(item, ["duration_seconds", "seconds"]);
    if (seconds !== undefined) return total + parseDurationHours(seconds, "seconds");

    return total + parseDurationHours(read(item, ["duration", "length"]));
  }, 0);
};

const formatHoursSummary = (hours) => {
  if (!hours) return "0 Hours of content";
  if (hours < 1) return `${Math.round(hours * 60)} Minutes of content`;

  const value = Number.isInteger(hours) ? hours : Number(hours.toFixed(1));
  return `${value} ${value === 1 ? "Hour" : "Hours"} of content`;
};

const formatRecordingDuration = (item) => {
  const hours = read(item, ["duration_hours", "hours"]);
  if (hours !== undefined) return `${toNumber(hours) ?? 0} hr`;

  const minutes = read(item, ["duration_minutes", "minutes"]);
  if (minutes !== undefined) return `${toNumber(minutes) ?? 0} mins`;

  const seconds = read(item, ["duration_seconds", "seconds"]);
  if (seconds !== undefined) return `${toNumber(seconds) ?? 0} secs`;

  return read(item, ["duration", "length"], "");
};

const normalizeProfile = (response, fallbackMember) => {
  const payload = getPayload(response);
  const user = payload.user || payload.member || payload;
  const firstName = read(user, ["firstname", "firstName"]);
  const lastName = read(user, ["lastname", "lastName"]);
  const name =
    read(user, ["name", "full_name", "fullname"]) ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    fallbackMember.name;

  return {
    ...fallbackMember,
    name,
    email: read(user, ["email"], fallbackMember.email),
    role: read(payload, ["role", "role_name", "team_role"], fallbackMember.role),
    roleTone: String(read(payload, ["role", "role_name", "team_role"], fallbackMember.roleTone)).toLowerCase(),
    status: read(payload, ["status", "team_status"], fallbackMember.status),
    statusTone: String(read(payload, ["status", "team_status"], fallbackMember.statusTone)).toLowerCase(),
    joined: read(payload, ["joined", "joined_at", "created_at"], fallbackMember.joined),
    totalHostedSessions: read(payload, ["total_hosted_sessions", "sessions_count", "hosted_sessions"]),
  };
};

const normalizePanelRows = (panel, response) => {
  const items = getPossibleArray(response);
  if (!items.length) return [];

  return items.map((item, index) => {
    if (panel.key === "rooms") {
      const id = read(item, ["id", "meeting_id", "room_id"]);
      const status = read(item, ["status", "room_status"]);
      const subtitle = [
        id ? `ID: ${id}` : null,
        status ? String(status) : null,
      ].filter(Boolean).join(" - ");

      return {
        title: read(item, ["name", "roomname", "title"], `Room ${index + 1}`),
        subtitle: subtitle || "-",
        action: "Join",
      };
    }

    if (panel.key === "recordings") {
      const duration = formatRecordingDuration(item);
      const size = read(item, ["size", "file_size", "fileSize", "megabytes", "mb"], "");
      const subtitle = [duration, size].filter(Boolean).join(" - ");

      return {
        title: read(item, ["name", "meeting_name", "title", "roomname"], `Recording ${index + 1}`),
        subtitle: subtitle || "-",
        action: "Play",
      };
    }

    const dateLabel = formatRelativeDate(
      read(item, ["last_hosted_at", "hosted_at", "started_at", "start_time", "date", "created_at"])
    );
    const attendeeCount = toNumber(
      read(item, ["attendees_count", "participants_count", "attendees", "participants"])
    );
    const subtitle = [
      dateLabel,
      attendeeCount !== undefined ? pluralize(attendeeCount, "Attendee") : null,
    ].filter(Boolean).join(" - ");

    return {
      title: read(item, ["title", "name", "roomname"], `Session ${index + 1}`),
      subtitle: read(item, ["summary"], subtitle || "-"),
      action: "Details",
    };
  });
};

const TeamDetail = ({ member, enabled = true }) => {
  const fallbackMember = member || {};
  const [activePanel, setActivePanel] = useState(null);
  const panel = activePanel ? detailPanels[activePanel] : null;
  const memberId = fallbackMember.id;
  const canFetchMemberDetails = enabled && Boolean(memberId);

  const profileQuery = useQuery({
    queryKey: ["team-member-profile", memberId],
    queryFn: () => fetchTeamMemberProfile(memberId),
    enabled: canFetchMemberDetails,
  });

  const roomsQuery = useQuery({
    queryKey: ["team-member-activity", "rooms", memberId],
    queryFn: () => fetchTeamMemberRooms(memberId),
    enabled: canFetchMemberDetails,
  });

  const recordingsQuery = useQuery({
    queryKey: ["team-member-activity", "recordings", memberId],
    queryFn: () => fetchTeamMemberRecordings(memberId),
    enabled: canFetchMemberDetails,
  });

  const sessionsQuery = useQuery({
    queryKey: ["team-member-activity", "sessions", memberId],
    queryFn: () => fetchTeamMemberSessions(memberId),
    enabled: canFetchMemberDetails,
  });

  const displayMember = normalizeProfile(profileQuery.data, fallbackMember);
  const roomCount = roomsQuery.isLoading
    ? null
    : getResponseCount(roomsQuery.data, [
        "active_rooms_count",
        "activeRoomsCount",
        "rooms_count",
        "roomsCount",
        "total",
        "count",
      ]);
  const recordingHours = recordingsQuery.isLoading ? null : getRecordingHours(recordingsQuery.data);
  const sessionCount = sessionsQuery.isLoading
    ? null
    : getResponseCount(sessionsQuery.data, [
        "total_hosted_sessions",
        "hosted_sessions",
        "sessions_count",
        "sessionsCount",
        "total",
        "count",
      ]);
  const latestSessionDate = getLatestDateValue(getPossibleArray(sessionsQuery.data));
  const totalHostedSessions =
    toNumber(displayMember.totalHostedSessions) ?? sessionCount ?? 0;
  const activitySubtitles = {
    rooms: roomsQuery.isLoading
      ? "Loading rooms..."
      : pluralize(roomCount ?? 0, "Active Room"),
    recordings: recordingsQuery.isLoading
      ? "Loading recordings..."
      : formatHoursSummary(recordingHours ?? 0),
    meetings: sessionsQuery.isLoading
      ? "Loading meetings..."
      : latestSessionDate
        ? `Last hosted: ${formatRelativeDate(latestSessionDate)}`
        : pluralize(sessionCount ?? 0, "Meeting Hosted", "Meetings Hosted"),
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start gap-4 pr-8">
          <Avatar className="h-16 w-16 shrink-0 shadow-md">
            <AvatarFallback
              className={cn(
                "bg-gradient-to-br text-2xl font-extrabold text-white",
                displayMember.avatarClassName
              )}
            >
              {displayMember.initials || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 pt-2">
            <DialogTitle className="truncate text-2xl font-extrabold tracking-tight text-foreground">
              {displayMember.name}
            </DialogTitle>
            <DialogDescription className="mt-1 truncate text-sm text-muted-foreground">
              {displayMember.email}
            </DialogDescription>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-surface p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.10)]">
          <div className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
            <DetailField label="Role">
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-sm font-bold",
                  roleStyles[displayMember.roleTone]
                )}
              >
                {displayMember.role}
              </span>
            </DetailField>
            <DetailField label="Status">
              <span
                className={cn(
                  "inline-flex items-center gap-2 text-sm font-semibold",
                  statusStyles[displayMember.statusTone]
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-current" />
                {displayMember.status}
              </span>
            </DetailField>
            <DetailField label="Joined Date">
              <span className="text-lg font-semibold text-foreground">
              {displayMember.joined || "-"}
              </span>
            </DetailField>
            <DetailField label="Total Hosted Sessions">
              <span className="text-lg font-semibold text-foreground">
                {totalHostedSessions}
              </span>
            </DetailField>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-foreground">
            Workspace Activity
          </h3>
          <div className="mt-3 h-px w-full bg-border/60" />
        </div>

        <div className="space-y-3">
          {activityItems.map((item) => {
            const ActivityIcon = item.icon;

            return (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface p-4"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    item.iconClassName
                  )}
                >
                  <ActivityIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {activitySubtitles[item.panel] || "0"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 shrink-0 rounded-xl border-border/80 bg-surface px-4 text-sm font-semibold shadow-none hover:bg-black/[0.02]"
                  onClick={() => setActivePanel(item.panel)}
                >
                  {item.action}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-border/80 bg-surface text-sm font-semibold text-foreground shadow-none hover:bg-black/[0.02]"
            >
              Close
            </Button>
          </DialogClose>
          <Button
            type="button"
            className="h-11 rounded-xl bg-brand-blue text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,44,136,0.25)] hover:bg-[#00379f]"
          >
            <Mail className="h-4 w-4" />
            Message
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(activePanel)}
        onOpenChange={(open) => {
          if (!open) setActivePanel(null);
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border-border/60 bg-surface p-6 shadow-2xl sm:p-8">
          {panel ? (
            <ActivityPanel
              memberId={memberId}
              panel={panel}
              onBack={() => setActivePanel(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};

const DetailField = ({ label, children }) => (
  <div>
    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <div className="mt-2">{children}</div>
  </div>
);

const ActivityPanel = ({ memberId, panel, onBack }) => {
  const PanelIcon = panel.icon;
  const panelQuery = useQuery({
    queryKey: ["team-member-activity", panel.key, memberId],
    queryFn: () => panel.queryFn(memberId),
    enabled: Boolean(memberId),
  });
  const rows = normalizePanelRows(panel, panelQuery.data);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pr-8">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground"
          aria-label="Back to team details"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
          {panel.title}
        </DialogTitle>
      </div>

      <div className="h-px w-full bg-border/60" />

      <div className="space-y-3">
        {panelQuery.isLoading ? (
          <div className="rounded-xl border border-border/60 bg-surface p-4 text-sm text-muted-foreground">
            Loading {panel.title.toLowerCase()}...
          </div>
        ) : null}
        {panelQuery.isError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
            Unable to load {panel.title.toLowerCase()}.
          </div>
        ) : null}
        {!panelQuery.isLoading && !panelQuery.isError && !rows.length ? (
          <div className="rounded-xl border border-border/60 bg-surface p-4 text-sm text-muted-foreground">
            0 {panel.title.toLowerCase()} found.
          </div>
        ) : null}
        {!panelQuery.isLoading && !panelQuery.isError ? rows.map((row) => (
          <div
            key={`${row.title}-${row.subtitle}`}
            className="flex items-center gap-4 rounded-xl border border-border/60 bg-surface p-4"
          >
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                panel.iconClassName
              )}
            >
              <PanelIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {row.title}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {row.subtitle}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-10 shrink-0 rounded-xl border-border/80 bg-surface px-4 text-sm font-semibold shadow-none hover:bg-black/[0.02]",
                row.highlighted &&
                  "border-brand-green/20 bg-brand-green/10 text-brand-blue hover:bg-brand-green/15"
              )}
            >
              {row.action}
            </Button>
          </div>
        )) : null}
      </div>
    </div>
  );
};

export default TeamDetail;
