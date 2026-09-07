import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  KeyRound,
  Clock3,
  Search,
  LoaderCircle,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import {
  createApiToken,
  deleteApiToken,
  fetchApiTokens,
} from "../api/tokensApi";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import { Skeleton } from "../components/ui/skeleton";
import { useToast } from "../hooks/use-toast";

const API_TOKENS_QUERY_KEY = ["api-tokens"];

const formatDisplayDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getPossibleArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.tokens)) return response.tokens;
  return [];
};

const readTokenId = (token, index) =>
  token?.id ??
  token?.token_id ??
  token?.tokenId ??
  token?.personal_access_token_id ??
  token?.uuid ??
  token?.reference ??
  index;

const looksLikeTokenSecret = (value) => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 16) return false;
  return /^[A-Za-z0-9|._-]+$/.test(trimmed);
};

const findCreatedTokenSecret = (payload) => {
  const candidates = [
    payload?.plainTextToken,
    payload?.plain_text_token,
    payload?.token,
    payload?.api_token,
    payload?.access_token,
    payload?.data?.plainTextToken,
    payload?.data?.plain_text_token,
    payload?.data?.token,
    payload?.data?.api_token,
    payload?.data?.access_token,
  ];

  return candidates.find(looksLikeTokenSecret) || "";
};

const maskTokenValue = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!looksLikeTokenSecret(trimmed)) return trimmed;
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 4)}******${trimmed.slice(-4)}`;
};

const readTokenLabel = (token, index, t) =>
  token?.name ||
  token?.device_name ||
  token?.device ||
  token?.user_agent ||
  token?.tokenable_id?.toString?.() ||
  t("apiTokens.fallbackLabel", { index: index + 1 });

const readUserAgent = (token) =>
  token?.user_agent || token?.device || token?.device_name || null;

const readCreatedDate = (token) =>
  token?.created_at ||
  token?.createdAt ||
  token?.created_time ||
  token?.createdTime;

const readLastUsedDate = (token) =>
  token?.last_used_at ||
  token?.lastUsedAt ||
  token?.last_used ||
  token?.lastUsed;

const normalizeTokens = (response, t) =>
  getPossibleArray(response).map((token, index) => {
    const id = readTokenId(token, index);
    const createdAt = readCreatedDate(token);
    const lastUsedAt = readLastUsedDate(token);
    const rawDisplayValue =
      typeof token?.token === "string"
        ? token.token
        : typeof token?.api_token === "string"
          ? token.api_token
          : "";

    return {
      id: String(id),
      label: readTokenLabel(token, index, t),
      userAgent: readUserAgent(token),
      createdAt: formatDisplayDate(createdAt),
      lastUsedAt: formatDisplayDate(lastUsedAt),
      ipAddress: token?.ip_address || token?.ipAddress || null,
      maskedValue: rawDisplayValue ? maskTokenValue(rawDisplayValue) : "",
    };
  });

const extractApiError = (error, fallback, notFoundMessage) => {
  const status = error?.response?.status;
  const responseMessage = error?.response?.data?.message;

  if (status === 404) {
    return notFoundMessage || fallback;
  }

  return responseMessage || error?.message || fallback;
};

const TokenRowSkeleton = () => (
  <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
  </div>
);

export default function ApiTokens() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDeleteToken, setPendingDeleteToken] = useState(null);
  const [revealedToken, setRevealedToken] = useState("");

  const tokenQuery = useQuery({
    queryKey: API_TOKENS_QUERY_KEY,
    queryFn: fetchApiTokens,
  });

  const tokens = useMemo(
    () => normalizeTokens(tokenQuery.data, t),
    [tokenQuery.data, t]
  );

  const createTokenMutation = useMutation({
    mutationFn: createApiToken,
    onSuccess: async (response) => {
      const secureTokenValue = findCreatedTokenSecret(response);

      toast({
        description: response?.message || t("apiTokens.createdSuccess"),
      });
      setTokenName("");
      setRevealedToken(secureTokenValue);
      await queryClient.invalidateQueries({ queryKey: API_TOKENS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: extractApiError(
          error,
          t("apiTokens.createError"),
          t("apiTokens.notFound")
        ),
      });
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: deleteApiToken,
    onSuccess: async (response) => {
      toast({
        description: response?.message || t("apiTokens.deletedSuccess"),
      });
      setPendingDeleteToken(null);
      await queryClient.invalidateQueries({ queryKey: API_TOKENS_QUERY_KEY });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        description: extractApiError(
          error,
          t("apiTokens.deleteError"),
          t("apiTokens.notFound")
        ),
      });
    },
  });

  const filteredTokens = tokens.filter((token) =>
    [token.label, token.userAgent, token.ipAddress].filter(Boolean).join(" ").toLowerCase().includes(searchTerm.trim().toLowerCase())
  );
  const isCreating = createTokenMutation.isPending;
  const isDeleting = deleteTokenMutation.isPending;
  const trimmedTokenName = tokenName.trim();

  const handleCreateToken = (event) => {
    event.preventDefault();
    if (!trimmedTokenName || isCreating) return;
    createTokenMutation.mutate(trimmedTokenName);
  };

  const handleCopyRevealedToken = async () => {
    if (!revealedToken) return;

    try {
      await navigator.clipboard.writeText(revealedToken);
      toast({ description: t("common.status.copiedToClipboard") });
    } catch {
      toast({
        variant: "destructive",
        description: t("apiTokens.copyFailed"),
      });
    }
  };

  return (
    <section className="flex flex-col gap-8 px-4 pb-10 sm:px-6 lg:px-[33px] animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t("apiTokens.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("apiTokens.subtitle")}</p>
        </div>
        <Button variant="outline" className="h-11 rounded-xl" disabled={tokenQuery.isFetching} onClick={() => tokenQuery.refetch()}>
          <RefreshCcw className={tokenQuery.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {t("apiTokens.refresh", "Refresh tokens")}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: t("apiTokens.totalTokens", "Total tokens"), value: tokens.length, icon: KeyRound, color: "bg-brand-blue/10 text-brand-blue" },
          { label: t("apiTokens.previouslyUsed", "Previously used"), value: tokens.filter((token) => token.lastUsedAt).length, icon: Clock3, color: "bg-brand-green/10 text-brand-green" },
          { label: t("apiTokens.neverUsed"), value: tokens.filter((token) => !token.lastUsedAt).length, icon: ShieldAlert, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface p-4 shadow-sm">
            <div className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-lg " + stat.color}><stat.icon className="h-5 w-5" /></div>
            <div>
              {tokenQuery.isLoading ? <Skeleton className="mb-1 h-8 w-12" /> : <p className="text-2xl font-bold text-foreground">{tokenQuery.isError ? "?" : stat.value}</p>}
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-6">
        <div className="space-y-4">
          <Card className="overflow-hidden rounded-2xl border-border/60 bg-surface shadow-sm">
            <CardHeader className="border-b border-border/60 p-5 sm:p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green"><Plus className="h-5 w-5" /></div>
              <CardTitle className="text-lg font-bold">{t("apiTokens.createTitle")}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">{t("apiTokens.createDescription")}</p>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              <form className="space-y-4" onSubmit={handleCreateToken}>
                <div className="space-y-2">
                  <Label htmlFor="api-token-name">{t("apiTokens.tokenName")}</Label>
                  <Input id="api-token-name" value={tokenName} onChange={(event) => setTokenName(event.target.value)} placeholder={t("apiTokens.tokenNamePlaceholder")} autoComplete="off" required disabled={isCreating} aria-describedby="token-private-hint" className="h-11 rounded-xl border-border/60 bg-muted/30 focus-visible:border-brand-green/50 focus-visible:ring-brand-green/30" />
                  <p id="token-private-hint" className="text-xs leading-5 text-muted-foreground">{t("apiTokens.privateWarning")}</p>
                </div>
                <Button type="submit" disabled={!trimmedTokenName || isCreating} className="main-action-button h-11 w-full rounded-xl">
                  {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {isCreating ? t("apiTokens.creating") : t("apiTokens.createButton")}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-6 text-muted-foreground">{t("apiTokens.securityNote")}</p>
          </div>
        </div>
        <Card className="min-w-0 overflow-hidden rounded-2xl border-border/60 bg-surface shadow-sm">
          <CardHeader className="space-y-4 border-b border-border/60 p-5 sm:p-6">
            <div>
              <CardTitle className="text-lg font-bold">{t("apiTokens.manageTitle")}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("apiTokens.manageDescription")}</p>
            </div>
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" aria-label={t("apiTokens.search", "Search tokens...")} placeholder={t("apiTokens.search", "Search tokens...")} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="h-11 rounded-xl border-border/60 bg-muted/30 pl-9 focus-visible:border-brand-green/50 focus-visible:ring-brand-green/30" />
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6" aria-busy={tokenQuery.isFetching}>
            {tokenQuery.isLoading ? (
              <div className="space-y-3"><TokenRowSkeleton /><TokenRowSkeleton /><TokenRowSkeleton /></div>
            ) : tokenQuery.isError ? (
              <div role="alert" className="flex flex-col items-center gap-3 rounded-xl bg-destructive/5 px-5 py-12 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <p className="font-semibold">{t("apiTokens.loadError")}</p>
                <p className="max-w-sm text-sm text-muted-foreground">{extractApiError(tokenQuery.error, t("apiTokens.retryHint"), t("apiTokens.notFound"))}</p>
                <Button variant="outline" className="mt-2 rounded-xl" disabled={tokenQuery.isFetching} onClick={() => tokenQuery.refetch()}><RefreshCcw className="h-4 w-4" />{t("common.actions.retry")}</Button>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue"><KeyRound className="h-6 w-6" /></div>
                <p className="mt-2 font-semibold">{tokens.length ? t("apiTokens.noMatches", "No matching tokens") : t("apiTokens.empty")}</p>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">{tokens.length ? t("apiTokens.searchHint", "Try a different name, device, or IP address.") : t("apiTokens.overview")}</p>
                {tokens.length > 0 && <Button variant="outline" className="rounded-xl" onClick={() => setSearchTerm("")}>{t("apiTokens.clearSearch", "Clear search")}</Button>}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTokens.map((token) => (
                  <article key={token.id} className="rounded-xl border border-border/60 p-4 transition-colors hover:bg-muted/20 sm:p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue"><KeyRound className="h-5 w-5" /></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-semibold text-foreground">{token.label}</h3>
                        {token.userAgent && <p className="mt-1 break-words text-xs text-muted-foreground">{token.userAgent}</p>}
                      </div>
                      <Button variant="ghost" size="icon" aria-label={t("apiTokens.delete") + " " + token.label} disabled={isDeleting} onClick={() => setPendingDeleteToken(token)} className="shrink-0 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    {token.maskedValue && <div className="mt-4 rounded-lg bg-muted/40 px-3 py-2"><span className="sr-only">{t("apiTokens.tokenPreviewLabel")}</span><code className="break-all text-xs text-muted-foreground">{token.maskedValue}</code></div>}
                    <dl className="mt-4 grid gap-3 border-t border-border/50 pt-4 text-xs sm:grid-cols-2">
                      <div><dt className="text-muted-foreground">{t("apiTokens.createdLabel")}</dt><dd className="mt-1 font-medium">{token.createdAt || t("apiTokens.notAvailable")}</dd></div>
                      <div><dt className="text-muted-foreground">{t("apiTokens.lastUsedLabel")}</dt><dd className="mt-1 font-medium">{token.lastUsedAt || t("apiTokens.neverUsed")}</dd></div>
                      {token.ipAddress && <div><dt className="text-muted-foreground">{t("apiTokens.ipAddressLabel")}</dt><dd className="mt-1 break-all font-mono">{token.ipAddress}</dd></div>}
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(revealedToken)}
        onOpenChange={(open) => {
          if (!open) setRevealedToken("");
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl border-border/60 bg-surface sm:max-w-lg">
          <DialogTitle>{t("apiTokens.secretDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("apiTokens.secretDialogDescription")}
          </DialogDescription>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("apiTokens.tokenValueLabel")}
            </p>
            <p className="mt-2 break-all rounded-xl bg-background/80 p-3 font-mono text-sm text-foreground">
              {revealedToken}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setRevealedToken("")}>
              {t("common.actions.cancel")}
            </Button>
            <Button className="main-action-button" onClick={handleCopyRevealedToken}>
              <Copy />
              {t("apiTokens.copy")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(pendingDeleteToken)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteToken(null);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl border-border/60 bg-surface sm:max-w-lg">
          <DialogTitle>{t("apiTokens.deleteDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("apiTokens.deleteDialogDescription", {
              name: pendingDeleteToken?.label || t("apiTokens.delete"),
            })}
          </DialogDescription>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setPendingDeleteToken(null)}
              disabled={isDeleting}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={isDeleting || !pendingDeleteToken?.id}
              onClick={() => deleteTokenMutation.mutate(pendingDeleteToken.id)}
            >
              {isDeleting ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  {t("apiTokens.deleting")}
                </>
              ) : (
                <>
                  <Trash2 />
                  {t("apiTokens.delete")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
