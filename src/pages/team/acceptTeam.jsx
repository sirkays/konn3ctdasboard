import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  UserCheck,
} from "lucide-react";

import { activateTeamInvite, checkTeamInviteToken } from "../../api/teamApi";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useToast } from "../../hooks/use-toast";
import useAuth from "../../hooks/useAuth";
import SideDetail from "../auth/SideDetail";
import logo from "../../assets/konn3ct_logo.png";
import { privacyPolicyUrl } from "../../lib/externalLinks";

const getPayload = (response) =>
  response?.data?.data ||
  response?.data?.invite ||
  response?.data?.invitation ||
  response?.data?.team_member ||
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
  const invite = payload.invite || payload.invitation || payload.team_invite || payload.team_member || payload;
  const team = payload.team || invite.team || payload.organization || invite.organization || {};
  const inviter = payload.inviter || payload.owner || payload.created_by || invite.inviter || {};
  const inviterName =
    read(inviter, ["name", "full_name", "fullname"]) ||
    joinName(
      read(inviter, ["firstname", "firstName"]),
      read(inviter, ["lastname", "lastName"])
    );

  const existingUser = payload.user || invite.user || null;
  const userExists = Boolean(
    payload.user_exists ??
    payload.is_existing_user ??
    (existingUser && (existingUser.email || existingUser.id || existingUser.firstname))
  );

  return {
    email: read(invite, ["email", "user.email", "member.email"], ""),
    role: read(invite, ["role", "role_name", "team_role"], "Member"),
    teamName: read(team, ["name", "team_name", "organization_name"], "Konn3ct"),
    inviterName: inviterName || "",
    firstName: read(invite, ["firstname", "firstName", "user.firstname", "user.firstName"]) || existingUser?.firstname || "",
    lastName: read(invite, ["lastname", "lastName", "user.lastname", "user.lastName"]) || existingUser?.lastname || "",
    userExists,
    existingUser,
  };
};

const extractApiError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const AcceptTeam = () => {
  const { activationToken } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, isAuthenticated, logout } = useAuth();
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

  const isCurrentLoggedInUser = useMemo(() => {
    if (!isAuthenticated || !authUser?.email || !inviteDetails.email) return false;
    return authUser.email.trim().toLowerCase() === inviteDetails.email.trim().toLowerCase();
  }, [isAuthenticated, authUser?.email, inviteDetails.email]);

  const isDifferentUserLoggedIn = useMemo(() => {
    if (!isAuthenticated || !authUser?.email || !inviteDetails.email) return false;
    return authUser.email.trim().toLowerCase() !== inviteDetails.email.trim().toLowerCase();
  }, [isAuthenticated, authUser?.email, inviteDetails.email]);

  useEffect(() => {
    if (hasSeededName || !tokenQuery.data) return;
    if (inviteDetails.firstName) setFirstName(inviteDetails.firstName);
    if (inviteDetails.lastName) setLastName(inviteDetails.lastName);
    setHasSeededName(true);
  }, [hasSeededName, inviteDetails.firstName, inviteDetails.lastName, tokenQuery.data]);

  const activateMutation = useMutation({
    mutationFn: () =>
      activateTeamInvite(
        activationToken,
        inviteDetails.userExists
          ? {}
          : {
              firstname: firstName,
              lastname: lastName,
              password: password,
            }
      ),
    onSuccess: (response) => {
      toast({
        description: response?.message || "Team invitation accepted successfully.",
      });
      if (isCurrentLoggedInUser) {
        setTimeout(() => {
          navigate("/team");
        }, 1500);
      }
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
    if (!inviteDetails.userExists && password.length < 8) {
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
                  has invited you to collaborate on Konn3ct
                  {inviteDetails.role ? ` as ${/^[aeiou]/i.test(inviteDetails.role) ? "an" : "a"} ${inviteDetails.role}` : ""}.
                  {inviteDetails.userExists
                    ? " Confirm below to accept the invitation and link this team to your existing account."
                    : " Complete your details below to activate your account."}
                </>
              ) : inviteDetails.userExists ? (
                "You have been invited to join a team on Konn3ct. Confirm below to accept the invitation and link this team to your existing account."
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

            {isDifferentUserLoggedIn ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold">Signed in as a different user</p>
                  <p className="text-xs opacity-90">
                    You are currently signed in as <strong>{authUser.email}</strong>, but this invitation was sent to <strong>{inviteDetails.email}</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={logout}
                    className="text-xs font-semibold underline hover:no-underline text-amber-700 dark:text-amber-300"
                  >
                    Sign out to accept with {inviteDetails.email}
                  </button>
                </div>
              </div>
            ) : null}

            {isActivated ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-[#207450] dark:text-emerald-400" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Team Invitation Accepted! 🎉</p>
                  <p className="text-xs opacity-90">
                    {isCurrentLoggedInUser
                      ? "Your account has been linked to the team. Redirecting to your workspace..."
                      : inviteDetails.userExists
                        ? "Your account has been linked to the team. Please sign in to access your workspace."
                        : "Your account has been activated. You can now log in to access your workspace."}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {inviteDetails.userExists ? (
              /* Existing Account Card */
              <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#207450]/10 text-[#207450] dark:bg-emerald-500/20 dark:text-emerald-300">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <p className="text-sm font-semibold text-foreground">
                        Existing Account Detected
                      </p>
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                        Ready to link
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You already have a Konn3ct account registered with this email. You do not need to create a new password or re-enter your details.
                    </p>
                    <div className="mt-2 rounded-xl bg-background/80 p-3 text-xs border border-border/60 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground truncate">
                          {inviteDetails.firstName || inviteDetails.lastName
                            ? `${inviteDetails.firstName} ${inviteDetails.lastName}`.trim()
                            : "Existing Konn3ct Account"}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          Role: <strong className="text-foreground">{inviteDetails.role}</strong>
                        </span>
                      </div>
                      <span className="text-muted-foreground block truncate">
                        {inviteDetails.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* New Account Creation Form */
              <>
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
              </>
            )}

            {/* Submit Button */}
            {isActivated ? (
              isCurrentLoggedInUser ? (
                <Button
                  asChild
                  type="button"
                  className="main-action-button mt-6 h-12 w-full rounded-xl text-sm font-semibold"
                >
                  <Link to="/team" className="flex items-center justify-center gap-2">
                    <span>Go to Team Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  type="button"
                  className="main-action-button mt-6 h-12 w-full rounded-xl text-sm font-semibold"
                >
                  <Link
                    to="/login"
                    state={{ email: inviteDetails.email }}
                    className="flex items-center justify-center gap-2"
                  >
                    <span>Continue to Sign In</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )
            ) : (
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  Boolean(errorMessage) ||
                  activateMutation.isPending ||
                  (!inviteDetails.userExists && password.length < 8)
                }
                className="main-action-button mt-6 h-12 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                {activateMutation.isPending ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                <span>
                  {inviteDetails.userExists ? "Accept & Join Team" : "Join Team"}
                </span>
              </Button>
            )}

            {/* Already have an account / Switch account link */}
            <div className="pt-2 text-center text-sm text-muted-foreground">
              {inviteDetails.userExists ? (
                <>
                  Want to sign in with a different account?{" "}
                  <Link
                    to="/login"
                    className="font-semibold text-[#207450] hover:underline dark:text-green-300"
                  >
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    state={{ email: inviteDetails.email }}
                    className="font-semibold text-[#207450] hover:underline dark:text-green-300"
                  >
                    Sign in
                  </Link>
                </>
              )}
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
