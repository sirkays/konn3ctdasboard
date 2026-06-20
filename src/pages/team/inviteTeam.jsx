import React, { useState } from "react";
import { Check, ChevronUp, Crown, Mail, Shield, User } from "lucide-react";

import {
  DialogClose,
  DialogDescription,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { cn } from "../../lib/utils";

const roleOptions = [
  {
    value: "Owner",
    title: "Owner",
    description: "Full access to all resources",
    icon: Crown,
  },
  {
    value: "Admin",
    title: "Admin",
    description: "Can manage members and settings",
    icon: Shield,
  },
  {
    value: "Member",
    title: "Member",
    description: "Standard user access",
    icon: User,
  },
];

const InviteTeam = ({ isSubmitting = false, onInvite }) => {
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState("Member");
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  const activeRole =
    roleOptions.find((role) => role.value === selectedRole) || roleOptions[2];
  const ActiveRoleIcon = activeRole.icon;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!email.trim() || isSubmitting) return;
    onInvite?.({ email: email.trim(), role: selectedRole });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground">
          Invite Team Member
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-6 text-muted-foreground">
          Send an invitation to add a new member to your team.
        </DialogDescription>
      </div>

      <div className="space-y-2">
        <Label htmlFor="team-invite-email" className="text-sm font-bold">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="team-invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="colleague@company.com"
            className="h-11 rounded-xl border-border/80 bg-surface pl-10 text-sm shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-brand-green/40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-bold">Assign Role</Label>
        <div className="relative">
          <button
            type="button"
            className={cn(
              "flex h-11 w-full items-center justify-between rounded-xl border bg-surface px-4 text-left text-sm font-medium text-foreground transition-colors",
              isRoleMenuOpen
                ? "border-brand-green ring-2 ring-brand-green/10"
                : "border-border/80 hover:border-brand-green/50"
            )}
            onClick={() => setIsRoleMenuOpen((open) => !open)}
          >
            <span className="flex items-center gap-3">
              <ActiveRoleIcon className="h-4 w-4 text-muted-foreground" />
              {activeRole.title}
            </span>
            <ChevronUp
              className={cn(
                "h-4 w-4 text-brand-green transition-transform",
                !isRoleMenuOpen && "rotate-180"
              )}
            />
          </button>

          {isRoleMenuOpen ? (
            <div className="mt-2 overflow-hidden rounded-2xl border border-border/60 bg-surface p-2 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
              {roleOptions.map((role) => {
                const RoleIcon = role.icon;
                const isSelected = role.value === selectedRole;

                return (
                  <button
                    key={role.value}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-brand-green/10 text-brand-green"
                        : "text-foreground hover:bg-black/[0.03]"
                    )}
                    onClick={() => {
                      setSelectedRole(role.value);
                      setIsRoleMenuOpen(false);
                    }}
                    >
                    <RoleIcon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isSelected
                          ? "text-brand-green"
                          : "text-muted-foreground"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm font-bold",
                          isSelected ? "text-brand-green" : "text-foreground"
                        )}
                      >
                        {role.title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {role.description}
                      </span>
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 shrink-0 text-brand-green" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-border/80 bg-surface px-5 text-sm font-semibold text-foreground shadow-none hover:bg-black/[0.02]"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </DialogClose>
        <Button
          type="submit"
          className="h-11 rounded-xl bg-brand-green px-5 text-sm font-semibold text-white shadow-none hover:bg-[#287854]"
          disabled={!email.trim() || isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send Invite"}
        </Button>
      </div>
    </form>
  );
};

export default InviteTeam;
