import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  FileText,
  Search,
  MessageSquare,
  Sparkles,
  Zap,
  X,
  Users,
  CalendarDays,
  ShieldAlert,
  User,
} from "lucide-react";
import {
  getAttendanceDetails,
  getMeetingSummary,
  getMeetingHighlights,
  getMeetingMinutes,
} from "../../api/attendanceApi";
import ExportActions from "../../components/ExportActions";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

const NAVBAR_HEIGHT = 72;

const normalizeStatus = (status) => {
  if (!status) return "participant";

  const normalizedStatus = String(status ?? "").trim().toLowerCase();

  if (
    normalizedStatus === "moderator" ||
    normalizedStatus === "host" ||
    normalizedStatus === "admin" ||
    normalizedStatus === "start meeting"
  ) {
    return "moderator";
  }
  return "participant";
};

const ViewAttendance = () => {
  const { t } = useTranslation();
  const { meeting_id, identifier } = useParams();
  const navigate = useNavigate();

  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTitle, setPanelTitle] = useState("");
  const [panelContent, setPanelContent] = useState("");
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getAttendanceDetails(meeting_id, identifier, page);
        setAttendanceData(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(t("attendance.details.states.loadError", "Failed to load attendance details."));
      } finally {
        setLoading(false);
      }
    };

    if (!meeting_id || !identifier) {
      setError(t("attendance.details.states.missingParams", "Missing parameters."));
      setLoading(false);
      return;
    }

    fetchDetails();
  }, [meeting_id, identifier, page, t]);

  const attendanceRows = useMemo(
    () => (Array.isArray(attendanceData?.data) ? attendanceData.data : []),
    [attendanceData]
  );

  const currentPage =
    Number.isFinite(Number(attendanceData?.current_page)) &&
    Number(attendanceData.current_page) > 0
      ? Number(attendanceData.current_page)
      : page;

  const lastPage =
    Number.isFinite(Number(attendanceData?.last_page)) &&
    Number(attendanceData.last_page) > 0
      ? Number(attendanceData.last_page)
      : 1;

  const perPage =
    Number.isFinite(Number(attendanceData?.per_page)) &&
    Number(attendanceData.per_page) > 0
      ? Number(attendanceData.per_page)
      : attendanceRows.length || 30;

  const rowStart =
    Number.isFinite(Number(attendanceData?.from)) &&
    Number(attendanceData.from) > 0
      ? Number(attendanceData.from)
      : attendanceRows.length > 0
        ? (currentPage - 1) * perPage + 1
        : 0;

  const openPanel = async (type) => {
    setPanelOpen(true);
    setPanelLoading(true);
    setPanelContent("");

    try {
      let result = "";

      if (type === "minutes") {
        setPanelTitle(t("attendance.details.panel.minutesTitle", "AI Meeting Minutes"));
        result = await getMeetingMinutes(meeting_id);
      }

      if (type === "highlights") {
        setPanelTitle(t("attendance.details.panel.highlightsTitle", "AI Highlights"));
        result = await getMeetingHighlights(meeting_id);
      }

      if (type === "summary") {
        setPanelTitle(t("attendance.details.panel.summaryTitle", "AI Summary"));
        result = await getMeetingSummary(meeting_id);
      }

      setPanelContent(result || t("attendance.details.panel.noDataReturned", "No data available."));
    } catch (panelError) {
      console.error(panelError);
      setPanelContent(t("attendance.details.panel.loadFailed", "Failed to load data."));
    } finally {
      setPanelLoading(false);
    }
  };

  const getMeetingAttendanceTitle = (count) =>
    t("attendance.details.export.title", { count }) || `Attendance Report (${count} participants)`;

  const serialHeader = t("attendance.details.table.serial", "#");
  const nameHeader = t("attendance.details.table.name", "Name");
  const emailHeader = t("attendance.details.table.email", "Email");
  const statusHeader = t("attendance.details.table.status", "Status");
  const dateTimeHeader = t("attendance.details.table.dateTime", "Date & Time");

  const exportRows = useMemo(
    () =>
      attendanceRows.map((row, index) => ({
        [serialHeader]: rowStart + index,
        [nameHeader]:
          row.name || row.attendee_name || t("attendance.common.notAvailable", "N/A"),
        [emailHeader]:
          row.email || row.attendee_email || t("attendance.common.notAvailable", "N/A"),
        [statusHeader]:
          normalizeStatus(row.status) === "moderator"
            ? t("attendance.details.status.moderator", "Moderator")
            : t("attendance.details.status.participant", "Participant"),
        [dateTimeHeader]: row.created_at
          ? new Date(row.created_at).toLocaleString("en-US")
          : row.date
            ? row.date + (row.time ? ` | ${row.time}` : "")
            : t("attendance.common.notAvailable", "N/A"),
      })),
    [
      attendanceRows,
      dateTimeHeader,
      emailHeader,
      nameHeader,
      rowStart,
      serialHeader,
      statusHeader,
      t,
    ]
  );

  const headers = useMemo(
    () => [serialHeader, nameHeader, emailHeader, statusHeader, dateTimeHeader],
    [dateTimeHeader, emailHeader, nameHeader, serialHeader, statusHeader]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exportRows;

    return exportRows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [exportRows, search]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          {t("attendance.details.states.loading", "Loading details...")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-4 border border-red-200 dark:border-red-900/50">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate("/attendance")}
            className="mb-4 h-8 px-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("attendance.details.actions.back", "Back to Attendance")}
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-blue" />
            {t("attendance.details.title", "Participant Details")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View attendee list, generate AI summaries, and export data.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPanel("minutes")}
              className="h-9 rounded-lg border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900/50 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            >
              <FileText className="mr-2 h-4 w-4" />
              {t("attendance.details.actions.sendMinutes", "AI Minutes")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPanel("highlights")}
              className="h-9 rounded-lg border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
            >
              <Zap className="mr-2 h-4 w-4" />
              {t("attendance.details.actions.sendHighlights", "AI Highlights")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPanel("summary")}
              className="h-9 rounded-lg border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100 hover:text-purple-800 dark:border-purple-900/50 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("attendance.details.actions.sendSummary", "AI Summary")}
            </Button>
          </div>
          <ExportActions
            headers={headers}
            rows={filteredRows}
            title={getMeetingAttendanceTitle(filteredRows.length)}
            filenameBase={`attendance-${meeting_id || "export"}`}
            labels={{
              copy: t("attendance.details.actions.copy", "Copy"),
              copied: t("attendance.details.actions.copied", "Copied!"),
              csv: t("attendance.details.actions.csv", "CSV"),
              excel: t("attendance.details.actions.excel", "Excel"),
              print: t("attendance.details.actions.print", "Print"),
            }}
            toastMessages={{
              copyFailed: t("attendance.details.toasts.copyFailed", "Failed to copy to clipboard."),
              allowPopups: t("attendance.details.toasts.allowPopups", "Please allow popups to print."),
            }}
            printFooter={t("attendance.details.export.printFooter", "Generated by Konn3ct")}
            showCopiedState
          />
        </div>
      </div>

      <div className="rounded-2xl border-border/60 bg-surface shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/40 bg-black/[0.01]">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("attendance.details.filters.search", "Search participants...")}
              className="pl-9 h-10 rounded-xl bg-background border-border/60 focus-visible:ring-brand-green/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[60px_1.5fr_2fr_1fr_1.5fr] items-center px-6 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/40 bg-black/[0.02]">
              <span>{serialHeader}</span>
              <span>{nameHeader}</span>
              <span>{emailHeader}</span>
              <span>{statusHeader}</span>
              <span>{dateTimeHeader}</span>
            </div>

            <div className="divide-y divide-border/40">
              {filteredRows.length === 0 ? (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  {t("attendance.details.states.empty", "No participants found.")}
                </div>
              ) : (
                filteredRows.map((row, index) => (
                  <div
                    key={`${row[serialHeader]}-${index}`}
                    className="grid grid-cols-[60px_1.5fr_2fr_1fr_1.5fr] items-center px-6 py-4 text-sm text-foreground hover:bg-black/[0.01] transition-colors"
                  >
                    <span className="font-medium text-muted-foreground">{row[serialHeader]}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-brand-blue" />
                      </div>
                      <span className="font-semibold">{row[nameHeader]}</span>
                    </div>
                    <span className="truncate text-muted-foreground pr-4" title={row[emailHeader]}>
                      {row[emailHeader]}
                    </span>
                    <span>
                      <Badge 
                        variant="outline" 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md font-semibold text-xs border-0 ${
                          String(row[statusHeader]).toLowerCase() === "moderator"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                        }`}
                      >
                        {String(row[statusHeader]).toLowerCase() === "moderator" ? (
                          <ShieldAlert className="mr-1 h-3 w-3" />
                        ) : (
                          <User className="mr-1 h-3 w-3" />
                        )}
                        {row[statusHeader]}
                      </Badge>
                    </span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{row[dateTimeHeader]}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {(attendanceRows.length > 0 || lastPage > 1) && (
          <div className="flex items-center justify-center py-4 border-t border-border/40 bg-black/[0.01]">
            <Pagination className="w-auto bg-background rounded-full border border-border/60 shadow-sm px-2 py-1">
              <PaginationContent className="flex items-center space-x-1">
                <PaginationItem>
                  <PaginationPrevious
                    className="h-8 w-8 rounded-full p-0 flex items-center justify-center hover:bg-black/5"
                    disabled={attendanceData?.prev_page_url === null || currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="text-sm font-medium text-foreground px-3">
                    {currentPage} <span className="text-muted-foreground font-normal">/ {lastPage}</span>
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    className="h-8 w-8 rounded-full p-0 flex items-center justify-center hover:bg-black/5"
                    disabled={attendanceData?.next_page_url == null || currentPage >= lastPage}
                    onClick={() => setPage((prev) => Math.min(lastPage, prev + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {panelOpen && (
        <div
          onClick={() => setPanelOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
        />
      )}

      <div
        className={`fixed right-0 z-50 border-l border-border/60 bg-surface shadow-2xl transition-transform duration-500 ease-out flex flex-col
        w-full md:w-[420px] lg:w-[480px]
        ${panelOpen ? "translate-x-0" : "translate-x-full"}`}
        style={{
          top: NAVBAR_HEIGHT,
          height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        }}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-black/[0.02]">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-blue" />
            <h3 className="text-base font-bold text-foreground">{panelTitle}</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPanelOpen(false)}
            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {panelLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="h-8 w-8 rounded-full border-4 border-brand-blue/30 border-t-brand-blue animate-spin" />
              <p className="text-sm font-medium text-muted-foreground">
                {t("attendance.details.panel.loading", "Generating insights...")}
              </p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap rounded-xl border border-border/60 bg-black/[0.02] p-5 text-sm leading-relaxed text-foreground shadow-inner">
                {panelContent}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewAttendance;
