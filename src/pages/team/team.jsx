import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Crown,
  Edit3,
  KeyRound,
  LoaderCircle,
  LogOut,
  Mail,
  MoreVertical,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCircle,
  UserCheck,
  Users,
} from "lucide-react";

import {
  fetchTeamList,
  inviteTeamMember,
  removeTeamMember,
  resetTeamMemberPassword,
  suspendTeamMember,
  unsuspendTeamMember,
  updateTeamMemberRole,
} from "../../api/teamApi";
import { getUser } from "../../api/userApi";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { useToast } from "../../hooks/use-toast";
import { cn } from "../../lib/utils";
import InviteTeam from "./inviteTeam";
import TeamDetail from "./component/teamDetail";
import UpgradeTeam from "./component/upgradeTeam";

const TEAM_QUERY_KEY = ["team-list"];
const DASHBOARD_BASE_URL = String(process.env.REACT_APP_SITE_URL || window.location.origin).replace(/\/$/, "");
const TEAM_ACTIVATION_LINK_BASE = `${DASHBOARD_BASE_URL}/team-invite`;
const roleOptions = ["Owner", "Admin", "Member"];

const roleStyles = {
  member: "bg-brand-green/10 text-brand-green",
  owner: "bg-orange-500/10 text-orange-500",
  admin: "bg-brand-blue/10 text-brand-blue",
};

const statusStyles = {
  active: "text-brand-green",
  pending: "text-orange-500",
  suspended: "text-red-500",
};

const getNested = (source, keys) => {
  for (const key of keys) {
    const value = key.split(".").reduce((acc, part) => acc?.[part], source);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
};

const getPossibleArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.members)) return response.data.members;
  if (Array.isArray(response?.members)) return response.members;
  if (Array.isArray(response?.team)) return response.team;
  if (Array.isArray(response?.invites)) return response.invites;
  return [];
};

const formatMonthYear = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
};

const toTitle = (value, fallback = "") => {
  const str = String(value ?? fallback).trim();
  if (!str) return fallback;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const getInitials = (name = "", email = "") => {
  const initials = String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || email?.[0]?.toUpperCase() || "U";
};

const getAvatarClassName = (index) =>
  [
    "from-[#3426b5] to-[#8a35eb]",
    "from-[#0056a8] to-[#007a58]",
    "from-[#b044f1] to-[#d66cff]",
    "from-[#207450] to-[#3c8464]",
    "from-[#c47a00] to-[#f3ad2f]",
  ][index % 5];

const buildTeamInviteLink = (value) => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";
  if (/^https?:\/\//i.test(rawValue)) return rawValue;
  if (rawValue.startsWith("/")) return `${DASHBOARD_BASE_URL}${rawValue}`;
  if (rawValue.includes("/")) return `${DASHBOARD_BASE_URL}/${rawValue.replace(/^\/+/, "")}`;
  return rawValue;
};

const buildActivationLink = (token) => {
  const rawToken = String(token || "").trim();
  if (!rawToken) return "";
  if (/^https?:\/\//i.test(rawToken)) return rawToken;
  if (rawToken.startsWith("/")) return `${DASHBOARD_BASE_URL}${rawToken}`;
  if (rawToken.includes("/")) return `${DASHBOARD_BASE_URL}/${rawToken.replace(/^\/+/, "")}`;
  return `${TEAM_ACTIVATION_LINK_BASE}/${encodeURIComponent(rawToken)}`;
};

const getInviteLinkValue = (source) =>
  getNested(source, [
    "invite_link",
    "inviteLink",
    "invite_url",
    "inviteUrl",
    "invitation_link",
    "invitationLink",
    "invitation_url",
    "invitationUrl",
    "activation_link",
    "activationLink",
    "activation_url",
    "activationUrl",
    "accept_link",
    "acceptLink",
    "accept_url",
    "acceptUrl",
    "invite.link",
    "invite.url",
    "invitation.link",
    "invitation.url",
    "data.invite_link",
    "data.inviteLink",
    "data.invite_url",
    "data.inviteUrl",
    "data.invitation_link",
    "data.invitationLink",
    "data.invitation_url",
    "data.invitationUrl",
    "data.activation_link",
    "data.activationLink",
    "data.activation_url",
    "data.activationUrl",
    "data.accept_link",
    "data.acceptLink",
    "data.accept_url",
    "data.acceptUrl",
    "data.invite.link",
    "data.invite.url",
    "data.invitation.link",
    "data.invitation.url",
  ]);

const getInviteTokenValue = (source) =>
  getNested(source, [
    "activation_token",
    "activationToken",
    "invite_token",
    "inviteToken",
    "invitation_token",
    "invitationToken",
    "team_invite_token",
    "teamInviteToken",
    "acceptance_token",
    "acceptanceToken",
    "token",
    "invite.token",
    "invitation.token",
    "data.activation_token",
    "data.activationToken",
    "data.invite_token",
    "data.inviteToken",
    "data.invitation_token",
    "data.invitationToken",
    "data.team_invite_token",
    "data.teamInviteToken",
    "data.acceptance_token",
    "data.acceptanceToken",
    "data.token",
    "data.invite.token",
    "data.invitation.token",
  ]);

const normalizeMember = (item, index) => {
  const firstName = getNested(item, ["firstname", "firstName", "user.firstname", "user.firstName"]);
  const lastName = getNested(item, ["lastname", "lastName", "user.lastname", "user.lastName"]);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const email = getNested(item, ["email", "user.email", "member.email"]) || "";
  const name =
    getNested(item, ["name", "full_name", "fullname", "user.name", "member.name"]) ||
    fullName ||
    email ||
    `Team Member ${index + 1}`;
  const rawRole =
    getNested(item, ["role", "role_name", "team_role", "pivot.role", "user.role"]) ||
    getNested(item, ["roles.0.name", "user.roles.0.name"]) ||
    "Member";
  const role = toTitle(rawRole, "Member");
  const rawStatus =
    getNested(item, ["status", "team_status", "invite_status", "invitation_status", "user.status"]) ||
    (getNested(item, ["accepted_at", "activated_at", "user.email_verified_at"]) ? "Active" : "Pending");
  const status = toTitle(rawStatus, "Pending");
  const id =
    getNested(item, ["id", "member_id", "team_member_id", "user_id", "user.id", "member.id"]) ??
    index;
  const joinedRaw = getNested(item, [
    "joined_at",
    "joined",
    "created_at",
    "accepted_at",
    "activated_at",
    "user.created_at",
  ]);
  const directInviteLink = getInviteLinkValue(item);
  const inviteToken = getInviteTokenValue(item);

  return {
    ...item,
    id: String(id),
    name,
    email,
    initials: getInitials(name, email),
    avatarClassName: getAvatarClassName(index),
    role,
    roleTone: role.toLowerCase(),
    status,
    statusTone: status.toLowerCase(),
    joined: formatMonthYear(joinedRaw),
    inviteLink: buildTeamInviteLink(directInviteLink) || buildActivationLink(inviteToken),
  };
};

const copyToClipboard = async (text) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
};

const extractApiError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const getPlanValue = (profile) =>
  getNested(profile, [
    "user_plan.name",
    "plan.name",
    "user.user_plan.name",
    "user.plan.name",
    "plan_name",
    "user.plan_name",
    "plan",
    "user.plan",
  ]);

const isBasicAccount = (profile) => {
  const plan = getPlanValue(profile);
  if (plan === 1 || plan === "1") return true;

  const normalizedPlan = String(plan || "basic").trim().toLowerCase();
  return normalizedPlan === "basic" || normalizedPlan === "free";
};

const Team = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteDialogView, setInviteDialogView] = useState("invite");

  const teamQuery = useQuery({
    queryKey: TEAM_QUERY_KEY,
    queryFn: fetchTeamList,
  });

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getUser,
  });

  const teamContext =
    profileQuery.data?.team_context ||
    teamQuery.data?.team_context ||
    {};
  const currentUserRole = teamContext.role || "Owner";
  const canManageTeam = teamContext.can_manage !== false && currentUserRole !== "Member";
  const isRegularMember = currentUserRole === "Member";

  const members = useMemo(
    () => getPossibleArray(teamQuery.data).map(normalizeMember),
    [teamQuery.data]
  );

  const stats = useMemo(() => {
    const active = members.filter((member) => member.statusTone === "active").length;
    const pending = members.filter((member) => member.statusTone === "pending").length;
    const admins = members.filter((member) => ["admin", "owner"].includes(member.roleTone)).length;

    return [
      { label: "Total Members", value: members.length, icon: Users, iconClassName: "text-brand-blue bg-brand-blue/10" },
      { label: "Active", value: active, icon: UserCheck, iconClassName: "text-brand-blue bg-brand-blue/10" },
      { label: "Pending Invites", value: pending, icon: Mail, iconClassName: "text-brand-blue bg-brand-blue/10" },
      { label: "Admins", value: admins, icon: Shield, iconClassName: "text-brand-blue bg-brand-blue/10" },
    ];
  }, [members]);

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return members;

    return members.filter((member) =>
      [member.name, member.email, member.role, member.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [members, search]);

  const teamLimitReached = isBasicAccount(profileQuery.data) && members.length >= 3;

  const handleInviteClick = () => {
    setInviteDialogView(teamLimitReached ? "upgrade" : "invite");
    setIsInviteOpen(true);
  };

  const handleUpgrade = () => {
    setIsInviteOpen(false);
    navigate("/payments");
  };

  const inviteMutation = useMutation({
    mutationFn: inviteTeamMember,
    onSuccess: async (response) => {
      toast({ description: response?.message || "Invite sent successfully." });
      setIsInviteOpen(false);
      await queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: extractApiError(error, "Unable to send invite."),
      });
    },
  });

  return (
    <div className="flex flex-col gap-8 pb-10 px-4 sm:px-6 lg:px-[33px] animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Teams
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your organization and team members.
          </p>
        </div>
        {canManageTeam ? (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <Button
              type="button"
              className="main-action-button h-11 w-full rounded-xl px-5 text-sm font-semibold sm:w-auto"
              onClick={handleInviteClick}
              disabled={teamQuery.isLoading || profileQuery.isLoading}
            >
              <Plus className="h-4 w-4" />
              Invite Member
            </Button>
            <DialogContent
              className={cn(
                "max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border-border/60 bg-surface p-5 shadow-2xl sm:p-6",
                inviteDialogView === "upgrade" ? "max-w-xl" : "max-w-md"
              )}
            >
              {inviteDialogView === "upgrade" ? (
                <UpgradeTeam onUpgrade={handleUpgrade} />
              ) : (
                <InviteTeam
                  isSubmitting={inviteMutation.isPending}
                  onInvite={(payload) => inviteMutation.mutate(payload)}
                />
              )}
            </DialogContent>
          </Dialog>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface px-4 py-2.5 text-xs font-semibold text-muted-foreground">
            <Shield className="h-4 w-4 text-brand-green" />
            Member Directory
          </div>
        )}
      </div>

      {isRegularMember && (
        <div className="flex items-center gap-3 rounded-2xl border border-brand-green/20 bg-brand-green/5 p-4 text-sm text-foreground">
          <Shield className="h-5 w-5 shrink-0 text-brand-green" />
          <div>
            <p className="font-semibold text-foreground">Team Directory</p>
            <p className="text-xs text-muted-foreground">
              You are viewing the {teamContext.team_name || "team"} directory as a Member. Team Admins and Owners can invite or manage members.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const StatIcon = stat.icon;

          return (
            <Card
              key={stat.label}
              className="rounded-2xl border-border/60 bg-surface shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    stat.iconClassName
                  )}
                >
                  <StatIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search team members..."
          className="h-11 rounded-xl border-border/60 bg-surface pl-10 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-brand-green/40"
        />
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 bg-surface shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
        <CardContent className="p-0">
          {teamQuery.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : teamQuery.isError ? (
            <div className="flex items-start gap-3 p-6 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-foreground">Unable to load team members.</p>
                <p className="mt-1">{extractApiError(teamQuery.error, "Please refresh and try again.")}</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-12 px-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Member
                  </TableHead>
                  <TableHead className="hidden h-12 px-5 text-xs font-bold uppercase tracking-wide text-muted-foreground md:table-cell">
                    Role
                  </TableHead>
                  <TableHead className="hidden h-12 px-5 text-xs font-bold uppercase tracking-wide text-muted-foreground lg:table-cell">
                    Status
                  </TableHead>
                  <TableHead className="hidden h-12 px-5 text-xs font-bold uppercase tracking-wide text-muted-foreground lg:table-cell">
                    Joined
                  </TableHead>
                  <TableHead className="h-12 px-5 text-right text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {canManageTeam ? "Actions" : "Details"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className="group hover:bg-black/[0.015]"
                  >
                    <TableCell className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0 shadow-sm">
                          <AvatarFallback
                            className={cn(
                              "bg-gradient-to-br text-xs font-bold text-white",
                              member.avatarClassName
                            )}
                          >
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">
                            {member.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 md:hidden">
                            <RoleBadge member={member} />
                            <StatusLabel member={member} />
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-5 py-4 md:table-cell">
                      <RoleBadge member={member} />
                    </TableCell>
                    <TableCell className="hidden px-5 py-4 lg:table-cell">
                      <StatusLabel member={member} />
                    </TableCell>
                    <TableCell className="hidden px-5 py-4 text-sm text-muted-foreground lg:table-cell">
                      {member.joined}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <TeamActions
                        member={member}
                        canManageTeam={canManageTeam}
                        currentUserRole={currentUserRole}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      No team members match your search.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const RoleBadge = ({ member }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
      roleStyles[member.roleTone] || roleStyles.member
    )}
  >
    {member.roleTone === "owner" ? <Crown className="h-3 w-3" /> : null}
    {member.role}
  </span>
);

const StatusLabel = ({ member }) => (
  <span
    className={cn(
      "inline-flex items-center gap-2 text-sm font-semibold",
      statusStyles[member.statusTone] || "text-muted-foreground"
    )}
  >
    {member.statusTone === "active" ? (
      <CheckCircle2 className="h-3.5 w-3.5 fill-current" />
    ) : (
      <span className="h-2.5 w-2.5 rounded-full bg-current" />
    )}
    {member.status}
  </span>
);

const TeamActions = ({ member, canManageTeam = true, currentUserRole = "Owner" }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState(null);
  const isSuspended = member.statusTone === "suspended";
  const isPending = member.statusTone === "pending";
  const isProtectedTarget = currentUserRole === "Admin" && ["owner", "admin"].includes(member.roleTone);

  const invalidateTeam = async () => {
    await queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY });
  };

  const updateRoleMutation = useMutation({
    mutationFn: updateTeamMemberRole,
    onSuccess: async (response) => {
      toast({ description: response?.message || "Role updated successfully." });
      setActionDialog(null);
      await invalidateTeam();
    },
    onError: (error) =>
      toast({ variant: "destructive", description: extractApiError(error, "Unable to update role.") }),
  });

  const removeMutation = useMutation({
    mutationFn: removeTeamMember,
    onSuccess: async (response) => {
      toast({ description: response?.message || "Team member removed." });
      setActionDialog(null);
      await invalidateTeam();
    },
    onError: (error) =>
      toast({ variant: "destructive", description: extractApiError(error, "Unable to remove member.") }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetTeamMemberPassword,
    onSuccess: (response) => {
      toast({ description: response?.message || "Password reset successfully." });
      setActionDialog(null);
    },
    onError: (error) =>
      toast({ variant: "destructive", description: extractApiError(error, "Unable to reset password.") }),
  });

  const suspendMutation = useMutation({
    mutationFn: isSuspended ? unsuspendTeamMember : suspendTeamMember,
    onSuccess: async (response) => {
      toast({
        description:
          response?.message ||
          (isSuspended ? "Team member unsuspended." : "Team member suspended."),
      });
      await invalidateTeam();
    },
    onError: (error) =>
      toast({ variant: "destructive", description: extractApiError(error, "Unable to update suspension status.") }),
  });

  const copyInviteMutation = useMutation({
    mutationFn: () =>
      inviteTeamMember({
        email: member.email,
        role: member.role || "Member",
      }),
  });

  const handleViewProfile = () => {
    setIsDetailOpen(true);
  };

  if (!canManageTeam || isProtectedTarget) {
    return (
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
          onClick={handleViewProfile}
        >
          <UserCircle className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
        <DialogContent className="max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-xl overflow-y-auto rounded-2xl border-border/60 bg-surface p-5 shadow-2xl sm:p-6">
          <TeamDetail member={member} enabled={isDetailOpen} />
        </DialogContent>
      </Dialog>
    );
  }

  const handleSuspendToggle = () => {
    suspendMutation.mutate(member.id);
  };

  const handleCopyInviteLink = async () => {
    const copyLink = async (link) => {
      await copyToClipboard(link);
      toast({ description: "Invite link copied." });
    };

    if (!member.email) {
      if (member.inviteLink) {
        try {
          await copyLink(member.inviteLink);
        } catch {
          toast({
            variant: "destructive",
            description: "Unable to copy invite link.",
          });
        }
        return;
      }

      toast({
        variant: "destructive",
        description: "No email address is available for this user.",
      });
      return;
    }

    try {
      const response = await copyInviteMutation.mutateAsync();
      const inviteLink =
        buildTeamInviteLink(getInviteLinkValue(response)) ||
        buildActivationLink(getInviteTokenValue(response)) ||
        member.inviteLink;

      if (!inviteLink) {
        toast({
          variant: "destructive",
          description:
            response?.message ||
            "Invite was sent, but the API did not return a copyable link.",
        });
        return;
      }

      await copyLink(inviteLink);
      await invalidateTeam();
    } catch (error) {
      if (!member.inviteLink) {
        toast({
          variant: "destructive",
          description: extractApiError(error, "Unable to create invite link."),
        });
        return;
      }

      try {
        await copyLink(member.inviteLink);
      } catch {
        toast({
          variant: "destructive",
          description: "Unable to copy invite link.",
        });
      }
    }
  };

  const handleBlockedMenu = () => {
    toast({
      variant: "destructive",
      description: "User not activated, extra actions are unavailable.",
    });
  };

  return (
    <>
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center justify-end gap-1.5 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
            <ActionTooltip label="Edit Profile">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"
                aria-label={`Edit profile for ${member.name}`}
                onClick={() => setActionDialog("role")}
              >
                <Edit3 className="h-4 w-4" />
              </Button>
            </ActionTooltip>

            <ActionTooltip label="Copy Invite Link">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-brand-green/10 hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Copy invite link for ${member.name}`}
                onClick={handleCopyInviteLink}
              >
                {copyInviteMutation.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </ActionTooltip>

            <ActionTooltip label="Delete">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                aria-label={`Delete ${member.name}`}
                onClick={() => setActionDialog("delete")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </ActionTooltip>

            {isPending ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-black/[0.06] hover:text-foreground"
                aria-label={`Extra actions unavailable for ${member.name}`}
                onClick={handleBlockedMenu}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-black/[0.06] hover:text-foreground data-[state=open]:bg-black/[0.06] data-[state=open]:text-foreground"
                    aria-label={`Open more actions for ${member.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  className="w-56 rounded-xl border-border/60 bg-surface p-1.5 text-foreground shadow-[0_18px_45px_rgba(0,0,0,0.12)]"
                >
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg px-3 py-2.5 text-sm focus:bg-black/[0.04]"
                    onSelect={handleViewProfile}
                  >
                    <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg px-3 py-2.5 text-sm focus:bg-black/[0.04]"
                    onSelect={() => setActionDialog("password")}
                  >
                    <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />
                    Reset Password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1.5 bg-border/60" />
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg px-3 py-2.5 text-sm text-orange-500 focus:bg-orange-500/10 focus:text-orange-500"
                    onSelect={handleSuspendToggle}
                    disabled={suspendMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {isSuspended ? "Unsuspend User" : "Suspend User"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </TooltipProvider>

        <DialogContent className="max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-xl overflow-y-auto rounded-2xl border-border/60 bg-surface p-5 shadow-2xl sm:p-6">
          <TeamDetail member={member} enabled={isDetailOpen} />
        </DialogContent>
      </Dialog>

      <UpdateRoleDialog
        member={member}
        open={actionDialog === "role"}
        onOpenChange={(open) => setActionDialog(open ? "role" : null)}
        isSubmitting={updateRoleMutation.isPending}
        onSubmit={(role) => updateRoleMutation.mutate({ id: member.id, role })}
      />
      <DeleteMemberDialog
        member={member}
        open={actionDialog === "delete"}
        onOpenChange={(open) => setActionDialog(open ? "delete" : null)}
        isSubmitting={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate(member.id)}
      />
      <ResetPasswordDialog
        member={member}
        open={actionDialog === "password"}
        onOpenChange={(open) => setActionDialog(open ? "password" : null)}
        isSubmitting={resetPasswordMutation.isPending}
        onSubmit={(password) => resetPasswordMutation.mutate({ id: member.id, password })}
      />
    </>
  );
};

const UpdateRoleDialog = ({ member, open, onOpenChange, isSubmitting, onSubmit }) => {
  const [role, setRole] = useState(member.role || "Member");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border-border/60 bg-surface p-5 sm:p-6">
        <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
        <DialogDescription>Update {member.name}'s team role.</DialogDescription>
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Role</Label>
          <div className="grid grid-cols-3 gap-2">
            {roleOptions.map((option) => (
              <Button
                key={option}
                type="button"
                variant={role === option ? "default" : "outline"}
                className={cn(
                  "h-10 rounded-xl text-sm",
                  role === option && "bg-brand-green text-white hover:bg-[#287854]"
                )}
                onClick={() => setRole(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline" className="h-10 rounded-xl">Cancel</Button>
          </DialogClose>
          <Button
            className="main-action-button h-10 rounded-xl"
            disabled={isSubmitting}
            onClick={() => onSubmit(role)}
          >
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const DeleteMemberDialog = ({ member, open, onOpenChange, isSubmitting, onConfirm }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border-border/60 bg-surface p-5 sm:p-6">
      <DialogTitle className="text-xl font-bold">Remove team member?</DialogTitle>
      <DialogDescription>
        This will remove {member.name} from your team.
      </DialogDescription>
      <div className="flex justify-end gap-3">
        <DialogClose asChild>
          <Button variant="outline" className="h-10 rounded-xl" disabled={isSubmitting}>Cancel</Button>
        </DialogClose>
        <Button
          variant="destructive"
          className="h-10 rounded-xl"
          disabled={isSubmitting}
          onClick={onConfirm}
        >
          {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
          Remove
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

const ResetPasswordDialog = ({ member, open, onOpenChange, isSubmitting, onSubmit }) => {
  const [password, setPassword] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border-border/60 bg-surface p-5 sm:p-6">
        <DialogTitle className="text-xl font-bold">Reset Password</DialogTitle>
        <DialogDescription>Set a new password for {member.name}.</DialogDescription>
        <div className="space-y-2">
          <Label htmlFor={`reset-password-${member.id}`} className="text-sm font-semibold">
            New password
          </Label>
          <Input
            id={`reset-password-${member.id}`}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-xl"
            placeholder="Enter new password"
          />
        </div>
        <div className="flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="outline" className="h-10 rounded-xl" disabled={isSubmitting}>Cancel</Button>
          </DialogClose>
          <Button
            className="main-action-button h-10 rounded-xl"
            disabled={isSubmitting || password.length < 8}
            onClick={() => onSubmit(password)}
          >
            {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
            Reset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ActionTooltip = ({ label, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

export default Team;
