import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ArrowLeft, Globe, Lock, Video, Check, Palette } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMeeting } from "../api/roomsApi";
import { useToast } from "../hooks/use-toast";
import { getJoinMeetingDisplayPrefix } from "../lib/externalLinks";

export default function NewRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [roomName, setRoomName] = useState("");
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState("meeting");
  const [privacy, setPrivacy] = useState("private");
  const [color, setColor] = useState("#10b981");

  const colors = [
    { value: "#3b82f6", label: "Blue", bgClass: "bg-blue-500" },
    { value: "#10b981", label: "Green", bgClass: "bg-[#10b981]" },
    { value: "#f97316", label: "Orange", bgClass: "bg-orange-500" },
    { value: "#a855f7", label: "Purple", bgClass: "bg-purple-500" },
    { value: "#ef4444", label: "Red", bgClass: "bg-red-500" },
    { value: "#06b6d4", label: "Cyan", bgClass: "bg-cyan-500" },
  ];

  const handleNameChange = (e) => {
    const val = e.target.value;
    setRoomName(val);
    if (!url || url === val.slice(0, -1).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")) {
      setUrl(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, ""));
    }
  };

  const createMeetingMutation = useMutation({
    mutationFn: createMeeting,
    onSuccess: (res, variables) => {
      if (res?.success) {
        const selectedColor = variables?.color || color || "#10b981";
        const createdRoom = res?.data;

        try {
          const storedColors = JSON.parse(localStorage.getItem("konn3ct_room_colors") || "{}");
          if (createdRoom?.id) {
            storedColors[`id:${createdRoom.id}`] = selectedColor;
          }
          if (createdRoom?.url || variables?.url) {
            storedColors[`url:${(createdRoom?.url || variables?.url).toLowerCase()}`] = selectedColor;
          }
          if (variables?.name) {
            storedColors[`name:${variables.name.trim().toLowerCase()}`] = selectedColor;
          }
          localStorage.setItem("konn3ct_room_colors", JSON.stringify(storedColors));
        } catch (_err) {
          // ignore storage errors
        }

        if (createdRoom && typeof createdRoom === "object") {
          queryClient.setQueryData(["rooms"], (prev) => {
            if (!prev || !Array.isArray(prev.rooms)) return prev;
            const exists = prev.rooms.some((r) => String(r.id) === String(createdRoom.id));
            const roomWithColor = { ...createdRoom, color: selectedColor };
            return {
              ...prev,
              rooms: exists
                ? prev.rooms.map((r) => (String(r.id) === String(createdRoom.id) ? roomWithColor : r))
                : [roomWithColor, ...prev.rooms],
            };
          });
        }

        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        toast({ description: t("rooms.toasts.meetingCreated", "Room created successfully") });
        navigate("/rooms");
      } else {
        if (res.message?.includes("Maximum room")) {
          toast({
            variant: "destructive",
            title: t("rooms.toasts.planLimitReachedTitle", "Plan Limit Reached"),
            description: t("rooms.toasts.planLimitReachedDescriptionWithAddons", "You have reached your room limit. Please upgrade."),
          });
        } else {
          toast({
            variant: "destructive",
            title: t("common.status.error", "Error"),
            description: res?.message,
          });
        }
      }
    },
    onError: (error) => {
      if (error.response?.data?.message?.includes("maximum room")) {
        toast({
          variant: "destructive",
          title: t("rooms.toasts.planLimitReachedTitle", "Plan Limit Reached"),
          description: t("rooms.toasts.planLimitReachedDescription", "You have reached your room limit. Please upgrade."),
        });
      } else {
        toast({
          variant: "destructive",
          title: t("common.status.error", "Error"),
          description: t("rooms.toasts.createError", "Failed to create room."),
        });
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomName.trim()) {
      toast({ variant: "destructive", description: t("rooms.createForm.validation.nameMin", "Room name must be at least 5 characters.") });
      return;
    }
    
    createMeetingMutation.mutate({
      name: roomName,
      url: url,
      mode,
      privacy: privacy === "private" ? 1 : 0,
      color,
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 bg-surface border border-border/60 hover:bg-black/[0.04]" onClick={() => navigate("/rooms")}>
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </Button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t("rooms.dialogs.create.title", "Create Room")}</h1>
          <p className="text-muted-foreground mt-1">{t("rooms.dialogs.create.description", "Set up a new reusable meeting space.")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Room Details */}
        <Card className="rounded-2xl border-border/60 bg-surface">
          <CardContent className="p-6 space-y-5">
            <h3 className="text-lg font-bold text-foreground border-b border-border/40 pb-3 flex items-center gap-2">
              <Video className="w-5 h-5 transition-colors" style={{ color }} /> Room Information
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t("rooms.createForm.roomName", "Room Name")}</label>
              <Input 
                required 
                value={roomName}
                onChange={handleNameChange}
                placeholder={t("rooms.createForm.roomNamePlaceholder", "e.g. Design Critique")} 
                className="h-11 bg-black/[0.02]" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t("rooms.createForm.roomUrl", "Custom URL")}</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground bg-black/[0.03] px-3 h-11 flex items-center rounded-xl border border-border/60 text-sm whitespace-nowrap">
                  {getJoinMeetingDisplayPrefix()}
                </span>
                <Input 
                  value={url}
                  onChange={(e) => setUrl(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder={t("rooms.createForm.roomUrlPlaceholder", "design-critique")} 
                  className="h-11 bg-black/[0.02] flex-1" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Room Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "meeting", label: "Meeting", description: "Interactive room for all participants." },
                  { value: "webinar", label: "Webinar", description: "Presenter-led room for an audience." },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      mode === option.value ? "border-brand-green bg-brand-green/5" : "border-border/60 hover:border-border"
                    }`}
                  >
                    <span className={`text-sm font-bold ${mode === option.value ? "text-brand-green" : "text-foreground"}`}>
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Customization */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-2xl border-border/60 bg-surface h-full">
            <CardContent className="p-6 space-y-5">
              <h3 className="text-lg font-bold text-foreground border-b border-border/40 pb-3 flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-green" /> Privacy
              </h3>
              <div className="space-y-3">
                {[
                  { key: "public", icon: Globe, label: "Public Room", desc: "Anyone with the link can join directly." },
                  { key: "private", icon: Lock, label: "Private Room", desc: "Guests must knock to enter the room." },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPrivacy(opt.key)}
                    className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                      ${privacy === opt.key ? "border-brand-green bg-brand-green/5" : "border-border/60 hover:border-border"}`}
                  >
                    <opt.icon className={`w-5 h-5 mt-0.5 ${privacy === opt.key ? "text-brand-green" : "text-muted-foreground"}`} />
                    <div>
                      <h4 className={`text-sm font-bold ${privacy === opt.key ? "text-brand-green" : "text-foreground"}`}>{opt.label}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-surface h-full">
            <CardContent className="p-6 space-y-5">
              <div className="border-b border-border/40 pb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Palette className="w-5 h-5 transition-colors" style={{ color }} /> Room Color
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                  {colors.find((c) => c.value.toLowerCase() === color.toLowerCase())?.label || color}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {colors.map((c) => {
                  const isSelected = color.toLowerCase() === c.value.toLowerCase();
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-label={c.label}
                      aria-pressed={isSelected}
                      onClick={() => setColor(c.value)}
                      style={{
                        backgroundColor: c.value,
                        boxShadow: isSelected ? `0 0 0 3px var(--background, #fff), 0 0 0 5px ${c.value}` : undefined,
                      }}
                      className={`relative h-14 rounded-xl flex flex-col items-center justify-center transition-all ${c.bgClass}
                        ${isSelected ? "scale-[1.04] opacity-100 font-bold" : "opacity-75 hover:opacity-95"}
                      `}
                    >
                      {isSelected ? (
                        <Check className="w-5 h-5 text-white drop-shadow" />
                      ) : (
                        <span className="text-[11px] font-semibold text-white/90 drop-shadow-sm">{c.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4 pt-4 border-t border-border/60">
          <Button variant="outline" type="button" onClick={() => navigate("/rooms")} className="h-12 px-6 rounded-xl border-border/60">
            {t("common.actions.cancel", "Cancel")}
          </Button>
          <Button disabled={createMeetingMutation.isPending} type="submit" className="main-action-button h-12 px-8 rounded-xl font-bold">
            {createMeetingMutation.isPending ? t("rooms.createForm.creating", "Creating...") : t("rooms.actions.createRoom", "Create Room")}
          </Button>
        </div>
      </form>
    </div>
  );
}
