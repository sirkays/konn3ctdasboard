import React from "react";
import { Bell, ChevronRight, Monitor, Palette, Shield, User } from "lucide-react";
// import { Eye } from "lucide-react";

import { cn } from "../../../lib/utils";

export const SETTINGS_SECTIONS = [
  {
    id: "profile",
    icon: User,
    title: "Profile",
    description: "Manage your personal information",
  },
  // Temporarily disabled: public profile preview.
  // {
  //   id: "view-profile",
  //   icon: Eye,
  //   title: "View Profile",
  //   description: "Preview your public profile experience",
  // },
  {
    id: "security",
    icon: Shield,
    title: "Security",
    description: "Password and authentication",
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications",
    description: "Choose what you get notified about",
  },
  {
    id: "appearance",
    icon: Palette,
    title: "Appearance",
    description: "Customize the look and feel",
  },
  {
    id: "sessions",
    icon: Monitor,
    title: "Sessions",
    description: "Manage active devices",
  },
];

const SettingsNavigation = ({ activeSection, onSectionChange }) => (
  <div className="space-y-2">
    {SETTINGS_SECTIONS.map((section) => {
      const isActive = activeSection === section.id;

      return (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
            isActive
              ? "border-brand-green/20 bg-brand-green/10 shadow-sm"
              : "border-transparent hover:bg-black/[0.02]"
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              isActive
                ? "bg-brand-green text-white"
                : "bg-black/[0.04] text-muted-foreground"
            )}
          >
            <section.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm font-semibold",
                isActive ? "text-brand-green" : "text-foreground"
              )}
            >
              {section.title}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {section.description}
            </p>
          </div>
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0",
              isActive ? "text-brand-green" : "text-muted-foreground/40"
            )}
          />
        </button>
      );
    })}
  </div>
);

export default SettingsNavigation;
