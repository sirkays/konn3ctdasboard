import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Layers, Loader2 } from "lucide-react";

import { getAddons } from "../api/addonsApi";
import {
  initializeCheckout,
  openPaystackPopup,
  preloadPaystackInline,
  verifyCheckout,
} from "../api/plansApi";
import { getUser } from "../api/userApi";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";
import { invalidateBillingQueries } from "./Payments";

const getStatusLabel = (status, t) => {
  switch (status) {
    case "active":
      return t("addons.status.active");
    case "inactive":
      return t("addons.status.inactive");
    case "running":
      return t("addons.status.running");
    case "ended":
      return t("addons.status.ended");
    case "verified":
      return t("addons.status.verified");
    case "pending":
      return t("addons.status.pending");
    case "success":
      return t("addons.status.success");
    case "failed":
      return t("addons.status.failed");
    case "inprogress":
      return t("addons.status.inProgress");
    case "loading":
      return t("addons.status.loading");
    default:
      return status;
  }
};

export const runAddonCheckoutFlow = async ({
  addonId,
  initializeCheckoutFn = initializeCheckout,
  openPaystackPopupFn = openPaystackPopup,
  verifyCheckoutFn = verifyCheckout,
  queryClient,
  toast,
  t,
  onStart,
  onFinish,
}) => {
  try {
    if (onStart) onStart();
    const session = await initializeCheckoutFn({
      item_type: "addon",
      addon_id: Number(addonId),
      currency: "NGN",
      provider: "paystack",
    });

    const localReference = session?.local_reference;

    await openPaystackPopupFn({
      accessCode: session?.access_code,
      paymentUrl: session?.payment_url,
      onSuccess: async (tx) => {
        try {
          const refToVerify = localReference || tx?.reference || tx?.trxref;
          if (refToVerify) {
            await verifyCheckoutFn(refToVerify);
          }
          await invalidateBillingQueries(queryClient);
          toast({ description: t("addons.toasts.purchaseSuccessful", "Addon purchased successfully!") });
        } catch (verifyError) {
          await invalidateBillingQueries(queryClient);
          toast({
            description:
              verifyError?.response?.data?.message ||
              t("addons.toasts.purchaseSuccessful", "Payment received. Updating addon status..."),
          });
        } finally {
          if (onFinish) onFinish();
        }
      },
      onCancel: () => {
        if (onFinish) onFinish();
        toast({ description: t("addons.toasts.paymentCancelled", "Payment cancelled.") });
      },
      onError: (err) => {
        if (onFinish) onFinish();
        toast({
          description:
            err?.response?.data?.message ||
            err?.message ||
            t("addons.states.loadErrorDescription", "Unable to complete payment."),
          variant: "destructive",
        });
      },
    });
  } catch (error) {
    if (onFinish) onFinish();
    toast({
      description:
        error?.response?.data?.message ||
        error?.message ||
        t("addons.states.loadErrorDescription", "Unable to initialize addon checkout."),
      variant: "destructive",
    });
  }
};

const Addon = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingAddonId, setProcessingAddonId] = useState(null);
  const verifiedCallbackRef = useRef(false);

  const { data, isSuccess, isError } = useQuery({
    queryFn: getAddons,
    queryKey: ["addons"],
  });

  const {
    isSuccess: userIsSuccess,
    isError: userIsError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: getUser,
  });

  useEffect(() => {
    preloadPaystackInline().catch(() => {});
  }, []);

  useEffect(() => {
    if (verifiedCallbackRef.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const callbackRef = params.get("reference") || params.get("trxref");
    if (!callbackRef) return;

    verifiedCallbackRef.current = true;
    params.delete("reference");
    params.delete("trxref");
    const newQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ""}${window.location.hash || ""}`;
    window.history.replaceState({}, document.title, cleanUrl);

    verifyCheckout(callbackRef)
      .then(async () => {
        await invalidateBillingQueries(queryClient);
        toast({ description: t("addons.toasts.purchaseSuccessful", "Addon purchased successfully!") });
      })
      .catch(async () => {
        await invalidateBillingQueries(queryClient);
      });
  }, [queryClient, t, toast]);

  if (isError || userIsError) {
    return (
      <section className="page container mx-auto !px-4 sm:!px-6 lg:!px-[33px]">
        <Card className="p-6 rounded-2xl">
          <p className="font-medium">{t("addons.states.loadErrorTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("addons.states.loadErrorDescription")}
          </p>
        </Card>
      </section>
    );
  }

  if (!isSuccess || !userIsSuccess) {
    return (
      <div className="p-6">
        <Skeleton className="w-full h-32 rounded-2xl mb-8" />
        <div className="grid gap-5 md:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const addons = Array.isArray(data?.data) ? data.data : [];
  const addonStatus = data?.current_status ?? {};

  const handleAddonPurchase = (addonId) => {
    runAddonCheckoutFlow({
      addonId,
      queryClient,
      toast,
      t,
      onStart: () => setProcessingAddonId(addonId),
      onFinish: () => setProcessingAddonId(null),
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-10 px-4 sm:px-6 lg:px-[33px] animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t("addons.title", "Addons & Services")}</h1>
        <p className="text-muted-foreground mt-1">{t("addons.subtitle", "Enhance your plan with additional features and resources.")}</p>
      </div>

      {/* Addons Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {addons.map(({ name, description, price, id }) => {
          const statusValue = addonStatus["addon" + id];
          const normalizedStatus = typeof statusValue === "string" ? statusValue.trim().toLowerCase() : "";
          const isActive = normalizedStatus === "active";
          const isProcessing = processingAddonId === id;

          const colorTheme = isActive ? "brand-green" : "brand-blue";

          return (
            <Card key={id} className="rounded-2xl border-border/60 bg-surface overflow-hidden hover:shadow-lg hover:shadow-brand-blue/5 transition-all duration-300 flex flex-col h-full relative">
              <CardContent className="p-6 flex flex-col flex-1">
                {/* Header Area */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${colorTheme}/10 text-${colorTheme} shrink-0`}>
                    <Layers className="h-6 w-6" />
                  </div>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className={cn("px-2.5 py-0.5 text-xs font-bold rounded-md uppercase tracking-wider", isActive ? "bg-brand-green/10 text-brand-green hover:bg-brand-green/20" : "")}
                  >
                    {statusValue ? getStatusLabel(normalizedStatus, t) : t("addons.status.unknown")}
                  </Badge>
                </div>

                <h3 className="text-xl font-bold text-foreground mb-2">{name}</h3>
                <p className="text-sm text-muted-foreground flex-1 mb-6 leading-relaxed">
                  {description}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-foreground">
                    NGN {new Intl.NumberFormat("en-NG").format(price)}
                  </span>
                </div>

                <div className="mt-auto">
                  <div className="w-full">
                    <Button
                      disabled={isProcessing}
                      className="main-action-button w-full h-11 rounded-xl font-semibold inline-flex items-center justify-center text-sm"
                      onClick={() => handleAddonPurchase(id)}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("addons.actions.processing", "Processing...")}
                        </>
                      ) : (
                        t("addons.actions.payNow", "Pay Now")
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {addons.length === 0 && (
        <div className="flex justify-center items-center h-40">
          <p className="text-muted-foreground">{t("addons.states.noData")}</p>
        </div>
      )}
    </div>
  );
};

export default Addon;
