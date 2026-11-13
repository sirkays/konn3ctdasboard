import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  PaginationLink,
} from "../components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Play, Download, Share2, MoreVertical, Clock,
  Film, Calendar, Search, Trash2, Users, Monitor, MessageSquare, Video,
  CheckCircle2, AlertCircle, Loader2, ExternalLink
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteRecording, getRecordings } from "../api/recordingApi";
import { byteToMB, formatDate } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import { Skeleton } from "../components/ui/skeleton";
import { BrandedDatePicker } from "../components/ui/branded-date-picker";

const Recordings = () => {
  const { t } = useTranslation();
  const recordingQuery = useQuery({
    queryKey: ["recordings"],
    queryFn: getRecordings,
  });

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [recordIdToDelete, setRecordIdToDelete] = useState(null);
  const [activeVideo, setActiveVideo] = useState(null);
  const [videoError, setVideoError] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState();
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const PAGE_SIZE = 12;

  const recordings = useMemo(() => {
    const raw = recordingQuery.data;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.data?.recordings)) return raw.data.recordings;
    if (Array.isArray(raw?.recordings)) return raw.recordings;
    return [];
  }, [recordingQuery.data]);

  useEffect(() => {
    if (!openDeleteDialog) setRecordIdToDelete(null);
  }, [openDeleteDialog]);

  const deleteRecordingMutation = useMutation({
    mutationFn: deleteRecording,
    onSuccess: () => {
      queryClient.invalidateQueries(["recordings"]);
      toast({ description: t("recordings.toasts.deleted", "Recording deleted successfully") });
    },
  });

  /* =========================
     Normalize Recording Item
  ========================= */
  const normalizeRecording = useCallback((item, index) => {
    const id = item?.id || item?.recording_id || item?.recordID || `rec-${index}`;
    const title = item?.title || item?.name || item?.room?.name || item?.room_name || t("recordings.untitled", "Untitled recording");
    const roomName = item?.room?.name || item?.room_name || item?.room?.slug || item?.room_slug || "";
    const url = item?.url || item?.playback_url || item?.playback?.format?.url || null;
    const status = String(item?.status || item?.state || (url ? "completed" : "unknown")).toLowerCase();

    // Parse date
    let dateObj = null;
    if (item?.createdAt || item?.created_at) {
      const d = new Date(item.createdAt || item.created_at);
      if (!Number.isNaN(d.getTime())) dateObj = d;
    } else if (item?.startTime) {
      const d = new Date(Number(item.startTime));
      if (!Number.isNaN(d.getTime())) dateObj = d;
    } else if (item?.date) {
      const d = new Date(item.date);
      if (!Number.isNaN(d.getTime())) dateObj = d;
    }

    // Parse duration (in minutes)
    let durationMins = 0;
    if (Number.isFinite(Number(item?.duration)) && Number(item?.duration) > 0) {
      durationMins = Number(item.duration) > 300 ? Number(item.duration) / 60 : Number(item.duration);
    } else if (item?.startTime && item?.endTime) {
      const s = Number(item.startTime);
      const e = Number(item.endTime);
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
        durationMins = (e - s) / (1000 * 60);
      }
    }

    const sizeMB = item?.size ? byteToMB(Number(item.size)) : null;
    const participants = Number(item?.participants) || 0;

    return {
      raw: item,
      id,
      title,
      roomName,
      url,
      status,
      dateObj,
      durationMins,
      sizeMB,
      participants,
    };
  }, [t]);

  const normalizedList = useMemo(() => {
    return recordings.map(normalizeRecording);
  }, [recordings, normalizeRecording]);

  const filteredRecordings = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return normalizedList.filter((item) => {
      const matchesSearch =
        !term ||
        item.title.toLowerCase().includes(term) ||
        item.roomName.toLowerCase().includes(term);

      let matchesDate = true;
      if (selectedDate && item.dateObj) {
        matchesDate = item.dateObj.toDateString() === selectedDate.toDateString();
      } else if (selectedDate && !item.dateObj) {
        matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });
  }, [normalizedList, searchTerm, selectedDate]);

  const totalPages = Math.max(1, Math.ceil(filteredRecordings.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginatedRecordings = filteredRecordings.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDate]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  /* =========================
     Calculations for Stats
  ========================= */
  const totalRecordingsCount = normalizedList.length;

  const totalDurationMinutes = normalizedList.reduce((acc, curr) => acc + (curr.durationMins || 0), 0);
  const totalDurationStr =
    totalDurationMinutes >= 60
      ? `${Math.floor(totalDurationMinutes / 60)}h ${Math.round(totalDurationMinutes % 60)}m`
      : totalDurationMinutes > 0
      ? `${Math.round(totalDurationMinutes)}m`
      : `${normalizedList.filter((r) => r.url || r.status === "completed").length} Ready`;

  const totalReadyCount = normalizedList.filter((r) => r.url || r.status === "completed").length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonthCount = normalizedList.filter((r) => {
    if (!r.dateObj) return false;
    return r.dateObj.getMonth() === currentMonth && r.dateObj.getFullYear() === currentYear;
  }).length;

  /* =========================
     Handlers
  ========================= */
  const handleDeleteClick = (id) => {
    setRecordIdToDelete(id);
    setOpenDeleteDialog(true);
    setOpenDropdownId(null);
  };

  const handlePlay = (rec) => {
    if (rec.status === "failed") {
      toast({
        variant: "destructive",
        title: "Recording Failed",
        description: "This recording session could not be processed.",
      });
      return;
    }

    if (rec.status === "recording") {
      toast({
        title: "Recording In Progress",
        description: "This meeting is currently active. Please check back after the session ends.",
      });
      return;
    }

    if (rec.url) {
      setVideoError(false);
      setActiveVideo({
        title: rec.title,
        roomName: rec.roomName,
        url: rec.url,
      });
      return;
    }

    if (rec.id && process.env.REACT_APP_PLAYBACK_URL) {
      window.open(`${process.env.REACT_APP_PLAYBACK_URL}/${rec.id}`, "_blank", "noopener,noreferrer");
      return;
    }

    toast({
      variant: "destructive",
      title: "Video Unavailable",
      description: "No playback stream URL is available for this recording.",
    });
  };

  const handleCopyLink = (rec) => {
    const linkToCopy =
      rec.url ||
      (rec.id && process.env.REACT_APP_PLAYBACK_URL ? `${process.env.REACT_APP_PLAYBACK_URL}/${rec.id}` : null);

    if (!linkToCopy) {
      toast({
        variant: "destructive",
        description: "No shareable link is available for this recording.",
      });
      return;
    }

    navigator.clipboard.writeText(linkToCopy).then(() => {
      toast({ description: t("recordings.toasts.linkCopied", "Recording link copied to clipboard") });
    });
  };

  const handleDownloadVideo = async (rec) => {
    if (!rec) return;

    if (rec.status === "failed") {
      toast({
        variant: "destructive",
        title: "Recording Failed",
        description: "This recording session could not be processed for download.",
      });
      return;
    }

    if (rec.status === "recording") {
      toast({
        title: "Recording In Progress",
        description: "Please wait until the recording session completes before downloading.",
      });
      return;
    }

    const targetUrl = rec.downloadUrl || rec.url || null;
    if (!targetUrl && !rec.id) {
      toast({
        variant: "destructive",
        description: "No video file available for download.",
      });
      return;
    }

    try {
      setDownloadingId(rec.id);
      toast({ description: t("recordings.toasts.downloadStarted", "Preparing recording download...") });
      await downloadRecordingFile({
        id: rec.id,
        url: targetUrl,
        title: rec.title || rec.roomName || rec.id,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: error?.message || "No video file available for download.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadLegacyParam = async (id, param, title = "") => {
    if (!id) {
      toast({
        variant: "destructive",
        description: "Recording identifier is missing.",
      });
      return;
    }

    try {
      setDownloadingId(id);
      toast({ description: t("recordings.toasts.downloadStarted", "Preparing recording download...") });
      await downloadRecordingFile({
        id,
        title: title || `${id}-${param}`,
        param,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        description: error?.message || "Unable to download recording asset.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDurationBadge = (durationMins, status, url) => {
    if (durationMins > 0) {
      if (durationMins >= 60) return `${Math.floor(durationMins / 60)}h ${Math.round(durationMins % 60)}m`;
      return `${Math.round(durationMins)}m`;
    }
    if (url || status === "completed") return "Ready";
    if (status === "recording") return "Live";
    if (status === "failed") return "Failed";
    return "0m";
  };

  const formatRecordingDate = (dateObj) => {
    if (!dateObj || Number.isNaN(dateObj.getTime())) {
      return t("common.states.unknown", "Unknown Date");
    }
    return formatDate(dateObj.getTime());
  };

  const renderStatusBadge = (status, url) => {
    if (status === "completed" || url) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3" /> Ready
        </span>
      );
    }
    if (status === "recording") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin" /> Recording
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3 h-3" /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30 capitalize">
        {status}
      </span>
    );
  };

  const colors = [
    "from-brand-blue to-blue-400",
    "from-brand-green to-emerald-400",
    "from-purple-500 to-pink-400",
    "from-amber-500 to-orange-400",
    "from-cyan-500 to-blue-400",
    "from-rose-500 to-red-400",
  ];

  /* =========================
     Render
  ========================= */
  if (recordingQuery.isLoading) {
    return (
      <div className="p-6">
        <Skeleton className="w-full h-[500px] rounded-2xl" />
      </div>
    );
  }

  if (recordingQuery.isError) {
    return (
      <section className="p-6">
        <Card className="p-6 rounded-2xl">
          <p className="font-medium text-rose-500">{t("common.states.error", "Error loading recordings.")}</p>
        </Card>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-10 px-4 sm:px-6 lg:px-[33px] animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Recordings</h1>
          <p className="text-muted-foreground mt-1">View, play, share, and manage your recorded sessions.</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Recordings", value: totalRecordingsCount, icon: Film, bg: "bg-brand-blue/10", color: "text-brand-blue" },
          { label: "Total Duration", value: totalDurationStr, icon: Clock, bg: "bg-brand-green/10", color: "text-brand-green" },
          { label: "Ready to Play", value: totalReadyCount, icon: Users, bg: "bg-purple-500/10", color: "text-purple-500" },
          { label: "This Month", value: thisMonthCount, icon: Calendar, bg: "bg-amber-500/10", color: "text-amber-500" },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={t("recordings.filters.searchPlaceholder", "Search by meeting name...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-11 bg-black/[0.02] border-border/60 rounded-xl focus-visible:ring-brand-green/30 focus-visible:border-brand-green/50"
          />
        </div>

        <BrandedDatePicker
          value={selectedDate}
          onChange={setSelectedDate}
          placeholder={t("recordings.filters.selectDate", "Pick a date")}
          triggerClassName="sm:w-[240px]"
        />

        {(searchTerm || selectedDate) && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setSelectedDate(undefined);
            }}
            className="h-11 rounded-xl text-muted-foreground hover:text-foreground hover:bg-black/[0.04]"
          >
            {t("recordings.filters.clear", "Clear filters")}
          </Button>
        )}
      </div>

      {/* Recording Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paginatedRecordings.map((rec, index) => {
          const thumbColor = colors[index % colors.length];
          const durationBadge = formatDurationBadge(rec.durationMins, rec.status, rec.url);
          const isPlayable = Boolean(rec.url || (rec.status !== "failed" && rec.status !== "recording"));

          return (
            <Card
              key={rec.id}
              className="rounded-2xl border-border/60 bg-surface hover:shadow-xl hover:shadow-brand-blue/5 transition-all duration-300 overflow-hidden group flex flex-col justify-between"
            >
              <div>
                {/* Thumbnail / Video Player Trigger */}
                <div
                  className={`relative h-44 bg-gradient-to-br ${thumbColor} flex items-center justify-center ${
                    isPlayable ? "cursor-pointer" : "cursor-not-allowed opacity-90"
                  }`}
                  onClick={() => handlePlay(rec)}
                >
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 text-brand-blue shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                      <Play className="h-6 w-6 ml-0.5 fill-brand-blue" />
                    </button>
                  </div>
                  <Play className="h-10 w-10 text-white/50 fill-white/50" />

                  {/* Top Status Badge */}
                  <div className="absolute top-3 left-3">
                    {renderStatusBadge(rec.status, rec.url)}
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/70 text-white text-[11px] font-medium backdrop-blur-sm shadow-sm">
                    {durationBadge}
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-foreground truncate" title={rec.title}>
                        {rec.title}
                      </h3>
                      {rec.roomName && rec.roomName !== rec.title && (
                        <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                          Room: {rec.roomName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRecordingDate(rec.dateObj)}
                      </p>
                    </div>

                    {/* MoreVertical Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === rec.id ? null : rec.id);
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg hover:bg-black/[0.04] text-muted-foreground transition-all shrink-0 ml-2 ${
                          openDropdownId === rec.id ? "bg-black/[0.04] opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                      {openDropdownId === rec.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(null);
                            }}
                          />
                          <div className="absolute right-0 top-8 z-50 w-44 overflow-hidden rounded-xl border border-border/60 bg-white text-black shadow-lg animate-in zoom-in-95 duration-150 dark:bg-black dark:text-white">
                            <div className="p-1.5 space-y-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  handleDownloadVideo(rec);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                              >
                                <Download className="h-4 w-4" /> {t("recordings.actions.download", "Download")}
                              </button>
                              <button
                                onClick={() => handleDeleteClick(rec.id)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" /> {t("recordings.actions.delete", "Delete")}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Card Footer Actions */}
              <div className="px-5 pb-4 pt-3 border-t border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                  {rec.sizeMB ? (
                    <span>{rec.sizeMB} MB</span>
                  ) : (
                    <span className="capitalize">{rec.status || "Video"}</span>
                  )}
                </div>

                <div className="flex gap-1.5">
                  {/* Play Button */}
                  <button
                    onClick={() => handlePlay(rec)}
                    disabled={!isPlayable}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.02] hover:bg-brand-green/10 text-muted-foreground hover:text-brand-green transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Play Recording"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </button>

                  {/* Share Button */}
                  <button
                    onClick={() => handleCopyLink(rec)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.02] hover:bg-brand-blue/10 text-muted-foreground hover:text-brand-blue transition-colors"
                    title={t("recordings.actions.copyLink", "Copy Link")}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Download Dropdown / Button */}
                  {rec.url ? (
                    <button
                      onClick={() => handleDownloadVideo(rec)}
                      disabled={downloadingId === rec.id}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.02] hover:bg-brand-green/10 text-muted-foreground hover:text-brand-green transition-colors disabled:opacity-50"
                      title={t("recordings.actions.download", "Download Video")}
                    >
                      {downloadingId === rec.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={downloadingId === rec.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.02] hover:bg-brand-green/10 text-muted-foreground hover:text-brand-green transition-colors disabled:opacity-50"
                          title={t("recordings.actions.download", "Download")}
                        >
                          {downloadingId === rec.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/60 shadow-lg p-1.5">
                        <DropdownMenuItem
                          onClick={() => handleDownloadVideo(rec)}
                          className="rounded-lg cursor-pointer flex items-center gap-2"
                        >
                          <Video className="w-4 h-4 text-muted-foreground" />
                          {t("recordings.actions.video", "Video (MP4)")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => downloadLegacyParam(rec.id, "screenshare", rec.title)}
                          className="rounded-lg cursor-pointer flex items-center gap-2"
                        >
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          {t("recordings.actions.screenshare", "Screenshare")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => downloadLegacyParam(rec.id, "chats", rec.title)}
                          className="rounded-lg cursor-pointer flex items-center gap-2"
                        >
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          {t("recordings.actions.chats", "Chats")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredRecordings.length === 0 && (
        <div className="flex flex-col justify-center items-center h-48 border border-dashed border-border/60 rounded-2xl bg-surface/50 p-6 text-center">
          <Film className="h-10 w-10 text-muted-foreground/40 mb-2" />
          <p className="text-sm font-semibold text-foreground">No recordings found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchTerm || selectedDate
              ? t("recordings.filters.noMatch", "No recordings matched your filter criteria.")
              : "Recorded sessions from your meetings will appear here."}
          </p>
        </div>
      )}

      {/* Pagination */}
      {filteredRecordings.length > 0 && totalPages > 1 && (
        <Pagination className="mt-6 flex justify-center">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="cursor-pointer"
              />
            </PaginationItem>
            <PaginationItem className="px-2 text-sm sm:hidden">
              {currentPage} / {totalPages}
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => 1 + i).map((index) => (
              <PaginationItem key={`page-${index}`} className="hidden sm:block">
                <PaginationLink
                  isActive={index === currentPage}
                  onClick={() => setCurrentPage(index)}
                  className="cursor-pointer"
                >
                  {index}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="cursor-pointer"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Video Player Modal */}
      <Dialog open={!!activeVideo} onOpenChange={(open) => !open && setActiveVideo(null)}>
        <DialogContent className="max-w-4xl w-[calc(100%-2rem)] p-0 overflow-hidden bg-black border-border/40 rounded-2xl">
          <div className="p-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
            <div className="min-w-0 pr-4">
              <DialogTitle className="text-white text-base font-semibold truncate">
                {activeVideo?.title || "Recording Playback"}
              </DialogTitle>
              {activeVideo?.roomName && (
                <p className="text-xs text-zinc-400 mt-0.5 truncate">{activeVideo.roomName}</p>
              )}
            </div>
            {activeVideo?.url && (
              <div className="flex items-center gap-2 shrink-0 mr-6">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white rounded-lg"
                  onClick={() =>
                    handleDownloadVideo({
                      id: activeVideo.id || "recording",
                      title: activeVideo.title,
                      roomName: activeVideo.roomName,
                      url: activeVideo.url,
                      downloadUrl: activeVideo.url,
                    })
                  }
                >
                  Download <Download className="h-3.5 w-3.5 ml-1.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white rounded-lg"
                  onClick={() => window.open(activeVideo.url, "_blank", "noopener,noreferrer")}
                >
                  Open in new tab <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </div>
            )}
          </div>
          <div className="relative aspect-video w-full bg-black flex items-center justify-center">
            {activeVideo?.url && !videoError ? (
              <video
                key={activeVideo.url}
                src={activeVideo.url}
                controls
                autoPlay
                onError={() => setVideoError(true)}
                className="w-full h-full max-h-[70vh] object-contain"
              >
                Your browser does not support the video tag.
              </video>
            ) : videoError ? (
              <div className="p-8 text-center text-zinc-300 max-w-md mx-auto flex flex-col items-center animate-in fade-in duration-300">
                <AlertCircle className="h-12 w-12 text-rose-500 mb-3" />
                <h3 className="text-base font-semibold text-white">Video Stream Unavailable</h3>
                <p className="text-xs text-zinc-400 mt-1 mb-4 leading-relaxed">
                  The video file could not be loaded from the server (HTTP 404 - Not Found). The recording file may have expired, was moved, or is temporarily unavailable.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white rounded-lg"
                    onClick={() => {
                      navigator.clipboard.writeText(activeVideo?.url || "");
                      toast({ description: "Video URL copied to clipboard" });
                    }}
                  >
                    Copy Stream URL
                  </Button>
                  <Button
                    size="sm"
                    className="main-action-button text-xs rounded-lg"
                    onClick={() => setVideoError(false)}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400">
                <Film className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No playable video stream found for this recording.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent className="w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] md:max-w-md rounded-2xl">
          <DialogTitle>{t("recordings.dialog.deleteTitle", "Delete Recording")}</DialogTitle>
          <DialogDescription>
            {t("recordings.dialog.deleteDescription", "Are you sure you want to delete this recording? This action cannot be undone.")}
          </DialogDescription>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setOpenDeleteDialog(false)} className="rounded-xl">
              {t("recordings.actions.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleteRecordingMutation.isPending}
              onClick={() => {
                deleteRecordingMutation.mutate(recordIdToDelete);
                setOpenDeleteDialog(false);
              }}
            >
              {t("recordings.actions.delete", "Delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recordings;

