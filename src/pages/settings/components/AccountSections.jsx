import React, { useState } from "react";
import { Bell, Computer, Lock, Monitor, Shield } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { getSessions, getUser, logoutSession } from "../../../api/userApi";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Skeleton } from "../../../components/ui/skeleton";
import { useToast } from "../../../hooks/use-toast";
import { capitalize, cn } from "../../../lib/utils";
import { PasswordForm } from "../../profile/PasswordForm";
import { ProfileForm } from "../../profile/ProfileForm";

export const SectionHeader = ({ icon: Icon, iconClassName, title, description }) => (
  <div className="flex items-center gap-3">
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green/10 text-brand-green",
        iconClassName
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  </div>
);

export const ProfileSection = () => {
  const { t } = useTranslation();
  const userQuery = useQuery({ queryKey: ["profile"], queryFn: getUser });

  if (userQuery.isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-2xl" />;
  }

  if (userQuery.isError) {
    return (
      <Card className="p-6">
        <p className="font-medium">{t("profile.states.profileLoadErrorTitle")}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("profile.states.profileLoadErrorDescription")}
        </p>
      </Card>
    );
  }

  const userPlan = userQuery.data?.user_plan ?? {};

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="overflow-hidden rounded-2xl border-border/60 bg-surface">
        <ProfileForm />
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-border/60 bg-surface">
          <CardContent className="p-6">
            <h3 className="mb-4 text-base font-bold text-foreground">
              {t("profile.info.activePlan")}
            </h3>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-black/[0.01] p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {capitalize(userPlan?.name ?? "Basic")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Current subscription plan
                </p>
              </div>
              <div className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-bold text-brand-green">
                {capitalize(userPlan?.status ?? "Active")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const SecuritySection = () => {
  const { t } = useTranslation();
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="rounded-2xl border-border/60 bg-surface">
        <CardContent className="space-y-5 p-6">
          <SectionHeader
            icon={Shield}
            iconClassName="bg-brand-blue/10 text-brand-blue"
            title={t("profile.tabs.password", "Security")}
            description={t("profile.password.helper", "Manage your password")}
          />
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-border/60 transition-all duration-300">
              <div className="flex items-center justify-between bg-surface p-4 hover:bg-black/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/[0.04]">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Password</p>
                    <p className="text-xs text-muted-foreground">
                      Keep your account secure
                    </p>
                  </div>
                </div>
                {!changingPassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setChangingPassword(true)}
                  >
                    Change
                  </Button>
                )}
              </div>

              {changingPassword && (
                <div className="animate-in slide-in-from-top-2 border-t border-border/40 px-4 pb-4 pt-4">
                  <PasswordForm onCancel={() => setChangingPassword(false)} />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const NotificationsSection = () => (
  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
    <Card className="rounded-2xl border-border/60 bg-surface">
      <CardContent className="space-y-5 p-6">
        <SectionHeader
          icon={Bell}
          iconClassName="bg-amber-500/10 text-amber-500"
          title="Notifications"
          description="Choose what you get notified about."
        />
        <div className="rounded-xl border border-dashed border-border/70 bg-black/[0.01] p-5 text-sm text-muted-foreground">
          Notification preferences will appear here when they are available.
        </div>
      </CardContent>
    </Card>
  </div>
);

export const SessionsSection = () => {
  const { t } = useTranslation();
  const sessionQuery = useQuery({ queryKey: ["sessions"], queryFn: getSessions });
  const { toast } = useToast();

  const sessionLogoutMutation = useMutation({
    mutationFn: logoutSession,
    onSuccess: (res) => toast({ description: res.message }),
  });

  if (sessionQuery.isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  if (sessionQuery.isError) {
    return (
      <Card className="rounded-2xl p-6">
        <p className="font-medium">{t("profile.states.sessionsLoadErrorTitle")}</p>
      </Card>
    );
  }

  const sessionName = String(sessionQuery.data?.currentToken?.name ?? "").split("||");
  const browserInfo = sessionName[0] || t("profile.states.unknownBrowser");
  const locationInfo = sessionName[1] || t("profile.states.unknownLocation");
  const thisUser = browserInfo === navigator.userAgent;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="rounded-2xl border-border/60 bg-surface">
        <CardContent className="space-y-5 p-6">
          <SectionHeader
            icon={Computer}
            iconClassName="bg-amber-500/10 text-amber-500"
            title={t("profile.tabs.sessions", "Active Sessions")}
            description={t(
              "profile.sessions.helper",
              "Manage devices logged into your account"
            )}
          />

          <div className="flex items-center justify-between rounded-xl border border-border/60 p-4 transition-colors hover:bg-black/[0.01]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/[0.04]">
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {browserInfo}
                </p>
                <p className="text-xs text-muted-foreground">
                  {locationInfo} -{" "}
                  <span className={thisUser ? "text-brand-green" : "text-muted-foreground"}>
                    {thisUser
                      ? t("profile.sessions.thisDevice", "This device")
                      : t("profile.sessions.otherDevices", "Other device")}
                  </span>
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-red-500/30 text-xs text-red-500 hover:bg-red-500/5 hover:text-red-600"
              onClick={() => sessionLogoutMutation.mutate()}
            >
              {t("profile.sessions.logoutOtherSessions", "Sign Out All")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
