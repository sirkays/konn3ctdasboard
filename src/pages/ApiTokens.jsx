import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  KeyRound,
  Laptop,
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
import { Separator } from "../components/ui/separator";
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
    <section className="flex flex-col gap-8 pb-10 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {t("apiTokens.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("apiTokens.subtitle")}
        </p>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden rounded-2xl border-border/60 bg-surface shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
          <CardHeader className="space-y-2 border-b border-border/60 p-5 sm:p-6 lg:p-8">
            <CardTitle className="text-2xl font-bold">
              {t("apiTokens.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("apiTokens.overview")}
            </p>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-start">
              <div className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green/10 text-brand-green">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">
                    {t("apiTokens.createTitle")}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {t("apiTokens.createDescription")}
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-muted-foreground">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p>{t("apiTokens.securityNote")}</p>
                </div>
              </div>

              <Card className="rounded-2xl border-border/60 bg-background shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <form className="space-y-4" onSubmit={handleCreateToken}>
                    <div className="space-y-2">
                      <Label htmlFor="api-token-name">
                        {t("apiTokens.tokenName")}
                      </Label>
                      <Input
                        id="api-token-name"
                        value={tokenName}
                        onChange={(event) => setTokenName(event.target.value)}
                        placeholder={t("apiTokens.tokenNamePlaceholder")}
                        autoComplete="off"
                      />
                      <p className="text-xs leading-5 text-muted-foreground">
                        {t("apiTokens.privateWarning")}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      disabled={!trimmedTokenName || isCreating}
                      className="w-full rounded-xl bg-brand-green text-white hover:bg-[#287854] sm:w-auto"
                    >
                      {isCreating ? (
                        <>
                          <LoaderCircle className="animate-spin" />
                          {t("apiTokens.creating")}
                        </>
                      ) : (
                        <>
                          <Plus />
                          {t("apiTokens.createButton")}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-8" />

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:items-start">
              <div className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  <Laptop className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">
                    {t("apiTokens.manageTitle")}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {t("apiTokens.manageDescription")}
                  </p>
                </div>
              </div>

              <Card className="rounded-2xl border-border/60 bg-background shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  {tokenQuery.isLoading ? (
                    <div className="space-y-3">
                      <TokenRowSkeleton />
                      <TokenRowSkeleton />
                      <TokenRowSkeleton />
                    </div>
                  ) : tokenQuery.isError ? (
                    <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <div className="space-y-3">
                          <div>
                            <p className="font-medium text-foreground">
                              {tokenQuery.error?.response?.status === 404
                                ? t("apiTokens.notFound")
                                : t("apiTokens.loadError")}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {extractApiError(
                                tokenQuery.error,
                                t("apiTokens.retryHint"),
                                t("apiTokens.notFound")
                              )}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => tokenQuery.refetch()}
                          >
                            <RefreshCcw />
                            {t("common.actions.retry")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : tokens.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 p-6 text-sm leading-6 text-muted-foreground">
                      {t("apiTokens.empty")}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tokens.map((token) => (
                        <div
                          key={token.id}
                          className="rounded-2xl border border-border/70 bg-background/80 p-4 transition-colors"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-3">
                              <div>
                                <p className="font-semibold text-foreground">
                                  {token.label}
                                </p>
                                {token.userAgent ? (
                                  <p className="mt-1 break-words text-sm text-muted-foreground">
                                    {token.userAgent}
                                  </p>
                                ) : null}
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>
                                  {t("apiTokens.lastUsedLabel")}:{" "}
                                  <span className="text-foreground/90">
                                    {token.lastUsedAt || t("apiTokens.neverUsed")}
                                  </span>
                                </p>
                                <p>
                                  {t("apiTokens.createdLabel")}:{" "}
                                  <span className="text-foreground/90">
                                    {token.createdAt || t("apiTokens.notAvailable")}
                                  </span>
                                </p>
                                {token.ipAddress ? (
                                  <p>
                                    {t("apiTokens.ipAddressLabel")}:{" "}
                                    <span className="text-foreground/90">
                                      {token.ipAddress}
                                    </span>
                                  </p>
                                ) : null}
                                {token.maskedValue ? (
                                  <p className="break-all">
                                    {t("apiTokens.tokenPreviewLabel")}:{" "}
                                    <span className="font-mono text-foreground/90">
                                      {token.maskedValue}
                                    </span>
                                  </p>
                                ) : null}
                              </div>
                            </div>

                            <Button
                              variant="destructive"
                              disabled={isDeleting}
                              onClick={() => setPendingDeleteToken(token)}
                              className="w-full sm:w-auto"
                            >
                              <Trash2 />
                              {t("apiTokens.delete")}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(revealedToken)}
        onOpenChange={(open) => {
          if (!open) setRevealedToken("");
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] md:max-w-xl">
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
            <Button onClick={handleCopyRevealedToken}>
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
        <DialogContent className="w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] md:max-w-xl">
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
