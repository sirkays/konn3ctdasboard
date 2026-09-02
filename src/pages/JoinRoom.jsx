import React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  CheckCircle2,
  Mic,
  MicOff,
  MonitorSmartphone,
  ShieldCheck,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

import { joinRoom } from "../api/roomsApi";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { useToast } from "../hooks/use-toast";
import {
  buildJoinMeetingUrl,
  privacyPolicyUrl,
} from "../lib/externalLinks";
import { cn } from "../lib/utils";

const normalizeMeetingUrl = (value) => {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) return "";

  const markdownLinkMatch = rawValue.match(/\]\((https?:\/\/[^)]+)\)/);
  if (markdownLinkMatch?.[1]) return markdownLinkMatch[1];

  return rawValue;
};

const JoinRoom = () => {
  const { t } = useTranslation();
  const quickNotes = [
    {
      icon: Video,
      title: t("rooms.join.media.camera", "Camera"),
      description: t("rooms.join.quickNotes.camera", "Choose your video preference before entering."),
    },
    {
      icon: Mic,
      title: t("rooms.join.media.microphone", "Mic"),
      description: t("rooms.join.quickNotes.mic", "Start with audio on or muted."),
    },
    {
      icon: ShieldCheck,
      title: t("rooms.join.quickNotes.secureTitle", "Secure access"),
      description: t("rooms.join.quickNotes.secureDescription", "Your meeting opens in a protected session."),
    },
  ];

  return (
    <div className="min-h-screen bg-muted/20 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              to="/"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-green"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("common.actions.backToDashboard", "Back to dashboard")}
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
              {t("rooms.join.title")}
            </h1>
            <p className="mt-1 max-w-2xl text-base text-muted-foreground md:text-lg">
              {t(
                "rooms.join.subtitle",
                "Enter your meeting details and choose how you want to connect."
              )}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="overflow-hidden rounded-2xl border-border bg-surface p-0 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
            <CardContent className="p-5 sm:p-8 lg:p-10">
              <JoinForm />
              <p className="mt-6 text-center text-xs leading-5 text-muted-foreground sm:text-sm">
                {t("rooms.join.termsPrefix")}{" "}
                <a
                  href={privacyPolicyUrl}
                  className="font-medium text-brand-blue underline underline-offset-4 dark:text-blue-400"
                  rel="noreferrer"
                  target="_blank"
                >
                  {t("rooms.join.privacyLinkLabel")}
                </a>
              </p>
            </CardContent>
          </Card>

          <aside className="space-y-6">
            <Card className="overflow-hidden rounded-2xl border-none bg-gradient-to-br from-brand-blue to-[#001D5C] p-0 text-white shadow-xl">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <Users className="h-6 w-6" />
                </div>
                <h2 className="mt-6 text-xl font-bold">
                  {t("rooms.join.readyTitle", "Ready to connect")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/80">
                  {t(
                    "rooms.join.readyDescription",
                    "Join a room by name or ID, then launch the meeting in a new window."
                  )}
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {quickNotes.map((note) => (
                <Card
                  key={note.title}
                  className="rounded-xl border-border bg-surface p-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10">
                      <note.icon className="h-5 w-5 text-brand-blue" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {note.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {note.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;

const JoinForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const getJoinErrorMessage = (error) => {
    const data = error?.response?.data;
    const fieldErrors = data?.errors;
    const firstFieldError =
      fieldErrors &&
      Object.values(fieldErrors)
        .flat()
        .find(Boolean);

    return (
      firstFieldError ||
      data?.message ||
      error?.message ||
      t("rooms.join.toasts.genericError")
    );
  };

  const joinMutation = useMutation({
    mutationFn: joinRoom,
    onSuccess: (res) => {
      if (res.success) {
        const meetingUrl =
          normalizeMeetingUrl(res.url) ||
          buildJoinMeetingUrl(res.sessionToken || res.data);

        if (meetingUrl) {
          window.open(meetingUrl, "_blank");
          navigate("/");
        } else {
          toast({
            description: t("rooms.join.toasts.meetingLinkMissing"),
            variant: "destructive",
          });
        }
      }
      toast({ description: res.message });
    },
    onError: (error) => {
      toast({
        description: getJoinErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  const formSchema = z.object({
    email: z.string().email({ message: t("rooms.join.validation.email") }),
    roomName: z
      .string()
      .min(2, { message: t("rooms.join.validation.roomNameMin") })
      .refine((value) => value.trim().length > 0, {
        message: t("rooms.join.validation.roomNameWhitespace"),
      }),
    name: z
      .string()
      .min(2, { message: t("rooms.join.validation.nameMin") })
      .refine((value) => value.trim().length > 0, {
        message: t("rooms.join.validation.nameWhitespace"),
      }),
    access_code: z
      .string()
      .min(1, {
        message: t("rooms.join.validation.accessCodeRequired", "Access code is required."),
      })
      .refine((value) => value.trim().length > 0, {
        message: t("rooms.join.validation.accessCodeRequired", "Access code is required."),
      }),
    cam: z.boolean(),
    mic: z.boolean(),
    mobile: z.boolean(),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      roomName: "",
      name: "",
      email: "",
      access_code: "",
      cam: true,
      mic: true,
      mobile:
        typeof window !== "undefined"
          ? window.matchMedia("(max-width: 767px)").matches
          : false,
    },
  });

  const onSubmit = (data) => {
    joinMutation.mutate(data);
  };

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10">
          <Video className="h-5 w-5 text-brand-blue" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("rooms.join.formEyebrow", "Meeting access")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("rooms.join.formDescription", "Set your preferences before joining.")}
          </p>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="roomName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={t("rooms.join.roomPlaceholder")}
                    className="h-12 rounded-xl border-border bg-black/[0.02] px-4 shadow-none focus-visible:ring-brand-green dark:bg-white/[0.03]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={t("rooms.join.namePlaceholder")}
                    className="h-12 rounded-xl border-border bg-black/[0.02] px-4 shadow-none focus-visible:ring-brand-green dark:bg-white/[0.03]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t("rooms.join.emailPlaceholder")}
                    className="h-12 rounded-xl border-border bg-black/[0.02] px-4 shadow-none focus-visible:ring-brand-green dark:bg-white/[0.03]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="access_code"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={t("rooms.join.accessCodePlaceholder", "Enter access code")}
                    className="h-12 rounded-xl border-border bg-black/[0.02] px-4 shadow-none focus-visible:ring-brand-green dark:bg-white/[0.03]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-3 gap-2">
            <MediaPreferenceButton
              control={form.control}
              name="cam"
              label={t("rooms.join.media.camera", "Camera")}
              enabledIcon={Video}
              disabledIcon={VideoOff}
            />
            <MediaPreferenceButton
              control={form.control}
              name="mic"
              label={t("rooms.join.media.microphone", "Mic")}
              enabledIcon={Mic}
              disabledIcon={MicOff}
            />
            <MediaPreferenceButton
              control={form.control}
              name="mobile"
              label={t("rooms.join.media.mobile", "Mobile")}
              enabledIcon={MonitorSmartphone}
              disabledIcon={MonitorSmartphone}
            />
          </div>
          <Button
            type="submit"
            className="h-12 w-full rounded-xl bg-brand-blue font-bold text-white shadow-[0_8px_24px_rgba(0,44,136,0.25)] hover:bg-[#0038A8]"
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending
              ? t("rooms.join.joining", "Joining...")
              : t("rooms.join.submit")}
          </Button>
        </form>
      </Form>
    </div>
  );
};

const MediaPreferenceButton = ({
  control,
  name,
  label,
  enabledIcon: EnabledIcon,
  disabledIcon: DisabledIcon,
}) => (
  <FormField
    control={control}
    name={name}
    render={({ field }) => {
      const active = Boolean(field.value);
      const Icon = active ? EnabledIcon : DisabledIcon;

      return (
        <FormItem>
          <FormControl>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => field.onChange(!active)}
              className={cn(
                "flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:text-sm",
                active
                  ? "border-brand-blue/60 bg-brand-blue/10 text-brand-blue shadow-sm dark:border-blue-400 dark:bg-blue-400/10 dark:text-blue-200"
                  : "border-border bg-background text-muted-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {active && <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" />}
            </button>
          </FormControl>
          <FormMessage />
        </FormItem>
      );
    }}
  />
);
