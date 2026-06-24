import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";

import { activateTeamInvite, checkTeamInviteToken } from "../../api/teamApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useToast } from "../../hooks/use-toast";

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
    email: read(invite, ["email", "user.email", "member.email"], "new.member@example.com"),
    role: read(invite, ["role", "role_name", "team_role"], "Admin"),
    teamName: read(team, ["name", "team_name", "organization_name"], "Konn3ct Inc"),
    inviterName: inviterName || "Alex Doe",
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
  const [hasSeededName, setHasSeededName] = useState(false);

  const tokenQuery = useQuery({
    queryKey: ["team-invite-token", activationToken],
    queryFn: () => checkTeamInviteToken(activationToken),
    enabled: Boolean(activationToken),
    retry: false,
  });

  const inviteDetails = useMemo(
    () => getInviteDetails(tokenQuery.data),
    [tokenQuery.data]
  );

  useEffect(() => {
    if (hasSeededName || !tokenQuery.data) return;
    setFirstName(inviteDetails.firstName);
    setLastName(inviteDetails.lastName);
    setHasSeededName(true);
  }, [hasSeededName, inviteDetails.firstName, inviteDetails.lastName, tokenQuery.data]);

  const activateMutation = useMutation({
    mutationFn: () => activateTeamInvite(activationToken),
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
    activateMutation.mutate();
  };

  const isLoading = tokenQuery.isLoading || tokenQuery.isFetching;
  const isActivated = activateMutation.isSuccess;
  const errorMessage = !activationToken
    ? "Invitation token is missing from this link."
    : tokenQuery.isError
      ? extractApiError(tokenQuery.error, "This invitation link is invalid or has expired.")
      : "";

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#f8faf9] px-4 py-4 text-black sm:px-6">
      <section className="w-full max-w-[672px] overflow-hidden rounded-[34px] border border-[#dde5e4] bg-white shadow-[0_24px_80px_rgba(15,40,55,0.08)]">
        <div className="bg-[#eaf3f1] px-6 pb-[52px] pt-12 text-center sm:px-12">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#034b8c] to-[#087552] text-[34px] font-extrabold leading-none text-white shadow-[0_16px_28px_rgba(8,89,91,0.25)]">
            K.
          </div>

          <h1 className="mt-8 text-[34px] font-extrabold leading-tight tracking-[-0.02em] text-black">
            Join {inviteDetails.teamName}
          </h1>
          <p className="mt-4 text-[21px] leading-8 text-[#9a9a9a]">
            <span className="font-extrabold text-black">
              {inviteDetails.inviterName}
            </span>{" "}
            has invited you to collaborate as an {inviteDetails.role}.
          </p>
        </div>

        <form className="px-7 pb-12 pt-12 sm:px-12" onSubmit={handleSubmit}>
          {isLoading ? (
            <StatusNotice
              icon={<LoaderCircle className="h-5 w-5 animate-spin" />}
              title="Checking invitation"
              description="Please wait while we verify your team invitation."
            />
          ) : null}

          {errorMessage ? (
            <StatusNotice
              icon={<AlertTriangle className="h-5 w-5" />}
              title="Invitation unavailable"
              description={errorMessage}
              variant="error"
            />
          ) : null}

          {isActivated ? (
            <StatusNotice
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="Invitation accepted"
              description="Your team invitation has been activated. You can now sign in to continue."
              variant="success"
            />
          ) : null}

          <div>
            <p className="text-[18px] font-extrabold uppercase tracking-wide text-[#9d9d9d]">
              Email Address
            </p>
            <p className="mt-3 text-[24px] font-semibold leading-tight text-black">
              {inviteDetails.email}
            </p>
          </div>

          <div className="mt-11 grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-[17px] font-extrabold leading-none text-black">
                First Name
              </span>
              <Input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="e.g. Sarah"
                className="mt-2 h-[67px] rounded-[18px] border-[#d5d5d5] bg-[#fbfbfb] px-6 text-[22px] text-black shadow-none placeholder:text-[#a9abad] focus-visible:ring-[#207450]"
                disabled={isLoading || isActivated}
              />
            </label>

            <label className="block">
              <span className="text-[17px] font-extrabold leading-none text-black">
                Last Name
              </span>
              <Input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="e.g. Doe"
                className="mt-2 h-[67px] rounded-none border-0 bg-[#e8f1ff] px-6 text-[20px] text-black shadow-none placeholder:text-[#93a0b0] focus-visible:ring-[#207450]"
                disabled={isLoading || isActivated}
              />
            </label>
          </div>

          <label className="mt-9 block">
            <span className="text-[17px] font-extrabold leading-none text-black">
              Create Password
            </span>
            <div className="mt-2 flex h-[72px] overflow-hidden">
              <div className="flex w-[62px] shrink-0 items-center justify-center rounded-l-[18px] border border-r-0 border-[#d5d5d5] bg-white text-[#9d9d9d]">
                <LockKeyhole className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className="h-full rounded-none border-0 bg-[#e8f1ff] px-3 text-[20px] text-black shadow-none focus-visible:ring-[#207450]"
                disabled={isLoading || isActivated}
              />
            </div>
          </label>

          {isActivated ? (
            <Button
              asChild
              type="button"
              className="mt-10 h-[72px] w-full rounded-[17px] bg-[#237c53] text-[22px] font-extrabold text-white shadow-none hover:bg-[#1f6f4a]"
            >
              <Link to="/login">
                Continue to Login
                <ArrowRight className="ml-2 h-6 w-6" />
              </Link>
            </Button>
          ) : (
            <Button
              type="submit"
              className="mt-10 h-[72px] w-full rounded-[17px] bg-[#237c53] text-[22px] font-extrabold text-white shadow-none hover:bg-[#1f6f4a]"
              disabled={isLoading || Boolean(errorMessage) || activateMutation.isPending}
            >
              {activateMutation.isPending ? (
                <LoaderCircle className="mr-2 h-6 w-6 animate-spin" />
              ) : null}
              Join Team
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          )}

          <p className="mt-10 text-center text-[17px] leading-7 text-[#9d9d9d]">
            By joining, you agree to the Terms of Service and Privacy Policy.
          </p>
        </form>
      </section>
    </main>
  );
};

const StatusNotice = ({ icon, title, description, variant = "default" }) => {
  const variantClassName =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : variant === "success"
        ? "border-[#cce6d8] bg-[#eff8f3] text-[#207450]"
        : "border-[#d8e5e3] bg-[#f4faf8] text-[#207450]";

  return (
    <div className={`mb-8 flex items-start gap-3 rounded-2xl border p-4 ${variantClassName}`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-extrabold">{title}</p>
        <p className="mt-1 text-sm leading-5 opacity-85">{description}</p>
      </div>
    </div>
  );
};

export default AcceptTeam;
