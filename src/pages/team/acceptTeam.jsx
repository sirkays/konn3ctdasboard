import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Shield,
  User,
} from "lucide-react";

import { activateTeamInvite, checkTeamInviteToken } from "../../api/teamApi";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useToast } from "../../hooks/use-toast";
import SideDetail from "../auth/SideDetail";
import logo from "../../assets/konn3ct_logo.png";
import { privacyPolicyUrl } from "../../lib/externalLinks";

const getPayload = (response) =>
  response?.data?.data ||
  response?.data?.invite ||
  response?.data?.invitation ||
  response?.data ||
  response?.invite ||
  response?.invitation ||
  response ||
  {};

const read = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const joinName = (...parts) => parts.filter(Boolean).join(" ").trim();

const getInviteDetails = (response) => {
  const payload = getPayload(response);
  const invite = payload.invite || payload.invitation || payload.team_invite || payload;
  const team = payload.team || invite.team || payload.organization || invite.organization || {};
  const inviter = payload.inviter || payload.owner || payload.created_by || invite.inviter || {};
  const inviterName =
    read(inviter, ["name", "full_name", "fullname"]) ||
    joinName(
      read(inviter, ["firstname", "firstName"]),
      read(inviter, ["lastname", "lastName"])
    );

  return {
    email: read(invite, ["email", "user.email", "member.email"], ""),
    role: read(invite, ["role", "role_name", "team_role"], "Member"),
    teamName: read(team, ["name", "team_name", "organization_name"], "Konn3ct"),
    inviterName: inviterName || "",
    firstName: read(invite, ["firstname", "firstName", "user.firstname", "user.firstName"]),
    lastName: read(invite, ["lastname", "lastName", "user.lastname", "user.lastName"]),
  };
};

const extractApiError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const AcceptTeam = () => {
  const { activationToken } = useParams();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasSeededName, setHasSeededName] = useState(false);

  const tokenQuery = useQuery({
    queryKey: ["team-invite-token", activationToken],
    queryFn: () => checkTeamInviteToken(activationToken),
    enabled: Boolean(activationToken),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const inviteDetails = useMemo(
    () => getInviteDetails(tokenQuery.data),
    [tokenQuery.data]
  );

  useEffect(() => {
    if (hasSeededName || !tokenQuery.data) return;
    if (inviteDetails.firstName) setFirstName(inviteDetails.firstName);
    if (inviteDetails.lastName) setLastName(inviteDetails.lastName);
    setHasSeededName(true);
  }, [hasSeededName, inviteDetails.firstName, inviteDetails.lastName, tokenQuery.data]);

  const activateMutation = useMutation({
    mutationFn: () =>
      activateTeamInvite(activationToken, {
        firstname: firstName,
        lastname: lastName,
        password: password,
      }),
    onSuccess: (response) => {
      toast({
        description: response?.message || "Team invitation accepted successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: extractApiError(error, "Unable to accept this team invitation."),
      });
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!activationToken || tokenQuery.isError || activateMutation.isPending) return;
    if (password.length < 8) {
      toast({
        variant: "destructive",
        description: "Password must be at least 8 characters.",
      });
      return;
    }
    activateMutation.mutate();
  };

  const isLoading = tokenQuery.isLoading;
  const isActivated = activateMutation.isSuccess;
  const errorMessage = !activationToken
    ? "Invitation token is missing from this link."
    : tokenQuery.isError
      ? extractApiError(tokenQuery.error, "This invitation link is invalid or has expired.")
      : "";

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background text-foreground transition-colors duration-300">
      {/* Left Form Column (Matches Login page structure & theme support) */}
      <main className="flex min-h-screen min-w-0 w-full items-center justify-center px-5 py-10 sm:px-10 lg:w-[52%] lg:px-12">
        <Card className="w-[calc(100vw-2.5rem)] min-w-0 max-w-[520px] border-0 bg-transparent p-0 shadow-none sm:w-full">
          {/* Logo */}
          <div className="mb-8">
            <Link to="/">
              <img src={logo} alt="Konn3ct" className="h-10 w-auto" />
            </Link>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Join {inviteDetails.teamName || "Konn3ct"}
              </h1>
              {inviteDetails.role ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#207450]/10 border border-[#207450]/20 px-2.5 py-0.5 text-xs font-semibold text-[#207450] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                  <Shield className="h-3 w-3" />
                  {inviteDetails.role}
                </span>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              {inviteDetails.inviterName ? (
                <>
                  <span className="font-semibold text-foreground">
                    {inviteDetails.inviterName}
                  </span>{" "}
                  has invited you to collaborate on Konn3ct. Complete your details below to activate your account.
                </>
              ) : (
                "You have been invited to join a team on Konn3ct. Complete your details below to activate your account."
              )}
            </p>
          </div>

          {/* Status Notifications */}
          <div className="mt-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                <LoaderCircle className="h-5 w-5 animate-spin text-[#207450]" />
                <span>Checking invitation details...</span>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Invitation Unavailable</p>
                  <p className="text-xs opacity-90">{errorMessage}</p>
                </div>
              </div>
            ) : null}

            {isActivated ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-[#207450] dark:text-emerald-400" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Team Invitation Accepted! 🎉</p>
                  <p className="text-xs opacity-90">
                    Your account has been activated. You can now log in to access your workspace.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Email (Read-only) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Input
                  type="email"
                  value={inviteDetails.email || ""}
                  readOnly
                  disabled
                  placeholder="name@example.com"
                  className="h-12 w-full rounded-xl border-border bg-muted/50 pl-10 text-foreground shadow-none cursor-not-allowed opacity-80"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* First & Last Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">
                  First Name
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sarah"
                    disabled={isLoading || isActivated}
                    className="h-12 w-full rounded-xl border-border bg-muted/30 pl-10 text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-[#207450]"
                  />
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">
                  Last Name
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    disabled={isLoading || isActivated}
                    className="h-12 w-full rounded-xl border-border bg-muted/30 pl-10 text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-[#207450]"
                  />
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                  Password
                </label>
                <span className="text-xs text-muted-foreground">
                  Min. 8 characters
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  disabled={isLoading || isActivated}
                  className="h-12 w-full rounded-xl border-border bg-muted/30 pl-10 pr-12 text-foreground placeholder:text-muted-foreground shadow-none focus-visible:ring-[#207450]"
                />
                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            {isActivated ? (
              <Button
                asChild
                type="button"
                className="main-action-button mt-6 h-12 w-full rounded-xl text-sm font-semibold"
              >
                <Link to="/login" className="flex items-center justify-center gap-2">
                  <span>Continue to Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  Boolean(errorMessage) ||
                  activateMutation.isPending ||
                  password.length < 8
                }
                className="main-action-button mt-6 h-12 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {activateMutation.isPending ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                <span>Join Team</span>
              </Button>
            )}

            {/* Already have an account link */}
            <div className="pt-2 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#207450] hover:underline dark:text-green-300"
              >
                Sign in
              </Link>
            </div>
          </form>

          {/* Privacy & Terms footer */}
          <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
            By joining, you agree to the Konn3ct{" "}
            <a
              href={privacyPolicyUrl || "#"}
              className="font-medium text-[#207450] underline underline-offset-2 dark:text-green-300"
              rel="noreferrer"
              target="_blank"
            >
              Terms of Use &amp; Privacy Policy
            </a>
            .
          </p>
        </Card>
      </main>

      {/* Right Hero / Branding Column */}
      <SideDetail variant="auth" />
    </div>
  );
};

export default AcceptTeam;
