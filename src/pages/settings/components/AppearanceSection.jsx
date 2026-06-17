import React from "react";
import { Languages, Monitor, Moon, Palette, SunMedium } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, CardContent } from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "../../../components/ui/select";
import { SUPPORTED_LANGUAGES } from "../../../constants/languages";
import useTheme from "../../../hooks/useTheme";
import { capitalize, cn } from "../../../lib/utils";
import { SectionHeader } from "./AccountSections";

const getActiveLanguage = (i18n) => {
  const normalizedResolvedLanguage = (i18n.resolvedLanguage || "").split("-")[0];
  const normalizedLanguage = (i18n.language || "").split("-")[0];

  const activeLanguageCode = SUPPORTED_LANGUAGES.some(
    (language) => language.code === normalizedResolvedLanguage
  )
    ? normalizedResolvedLanguage
    : SUPPORTED_LANGUAGES.some((language) => language.code === normalizedLanguage)
      ? normalizedLanguage
      : "en";

  const activeLanguageLabel =
    SUPPORTED_LANGUAGES.find((language) => language.code === activeLanguageCode)
      ?.name || "English";

  return { activeLanguageCode, activeLanguageLabel };
};

const themeOptions = [
  {
    value: "light",
    labelKey: "settings.appearance.options.light.label",
    icon: SunMedium,
    descriptionKey: "settings.appearance.options.light.description",
  },
  {
    value: "dark",
    labelKey: "settings.appearance.options.dark.label",
    icon: Moon,
    descriptionKey: "settings.appearance.options.dark.description",
  },
  {
    value: "system",
    labelKey: "settings.appearance.options.system.label",
    icon: Monitor,
    descriptionKey: "settings.appearance.options.system.description",
  },
];

const AppearanceSection = () => {
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const systemModeLabel = capitalize(resolvedTheme);
  const { activeLanguageCode, activeLanguageLabel } = getActiveLanguage(i18n);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="rounded-2xl border-border/60 bg-surface">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeader
              icon={Languages}
              iconClassName="bg-brand-blue/10 text-brand-blue"
              title="Language"
              description="Choose the language used across your dashboard."
            />
            <div className="inline-flex w-fit items-center rounded-full border border-border bg-black/[0.02] px-3 py-1.5 text-xs text-muted-foreground">
              Current language:&nbsp;
              <span className="font-semibold text-foreground">
                {activeLanguageLabel}
              </span>
            </div>
          </div>

          <div className="max-w-md">
            <Select
              value={activeLanguageCode}
              onValueChange={(languageCode) => i18n.changeLanguage(languageCode)}
            >
              <SelectTrigger className="h-11 rounded-xl border-border/70 bg-black/[0.02] px-4">
                <span className="truncate text-foreground">
                  {activeLanguageLabel}
                </span>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/70 p-2">
                {SUPPORTED_LANGUAGES.map((language) => (
                  <SelectItem
                    key={language.code}
                    value={language.code}
                    className="rounded-lg px-3 py-2.5"
                  >
                    {language.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60 bg-surface">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionHeader
              icon={Palette}
              title={t("settings.appearance.title", "Appearance")}
              description={t(
                "settings.appearance.description",
                "Choose how the dashboard looks."
              )}
            />
            <div className="inline-flex w-fit items-center rounded-full border border-border bg-black/[0.02] px-3 py-1.5 text-xs text-muted-foreground">
              {t("settings.appearance.activeTheme", "Active theme")}:&nbsp;
              <span className="font-semibold text-foreground">
                {theme === "system"
                  ? t("settings.appearance.systemActiveTheme", {
                      theme: systemModeLabel,
                    })
                  : capitalize(theme)}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {themeOptions.map(({ value, labelKey, icon: Icon, descriptionKey }) => {
              const isSelected = theme === value;

              return (
                <label
                  key={value}
                  className={cn(
                    "group relative flex cursor-pointer flex-col rounded-xl border p-4 shadow-sm transition-all focus-within:ring-2 focus-within:ring-ring",
                    isSelected
                      ? "border-brand-green/30 bg-brand-green/10 shadow-sm"
                      : "border-border/70 bg-black/[0.01] hover:bg-black/[0.03]"
                  )}
                >
                  <input
                    checked={isSelected}
                    className="sr-only"
                    name="theme"
                    onChange={() => setTheme(value)}
                    type="radio"
                    value={value}
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isSelected
                          ? "bg-brand-green text-white"
                          : "bg-black/[0.04] text-muted-foreground group-hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            isSelected ? "text-brand-green" : "text-foreground"
                          )}
                        >
                          {t(labelKey)}
                        </span>
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                            isSelected
                              ? "border-brand-green bg-brand-green"
                              : "border-border bg-background"
                          )}
                        >
                          <span
                            className={cn(
                              "h-2.5 w-2.5 rounded-full transition-colors",
                              isSelected ? "bg-white" : "bg-transparent"
                            )}
                          />
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {t(descriptionKey)}
                      </p>
                    </div>
                  </div>
                  {value === "system" && (
                    <p className="mt-4 text-xs leading-5 text-muted-foreground">
                      {t("settings.appearance.systemModeDescription", {
                        theme: systemModeLabel.toLowerCase(),
                      })}
                    </p>
                  )}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceSection;
