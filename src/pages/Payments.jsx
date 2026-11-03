import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import React, { useEffect, useRef, useState } from "react";
import { Check, Crown, Zap, Shield, ArrowRight, FileText, Loader2 } from "lucide-react";
import {
  getList,
  getPlans,
  initializeCheckout,
  openPaystackPopup,
  preloadPaystackInline,
  verifyCheckout,
} from "../api/plansApi";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import { capitalize } from "../lib/utils";
import { getUser } from "../api/userApi";
import { useToast } from "../hooks/use-toast";
import { format } from "date-fns";
import { contactSalesUrl } from "../lib/externalLinks";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../components/ui/skeleton";

const ENGLISH_LOCALE = "en-NG";

export const DEFAULT_BILLING_CYCLE = "yearly";

const generateReceipt = (payment, user, toast, t) => {
  const userLastName = user?.lastname ?? user?.lastName ?? "";
  const userFirstName = user?.firstname ?? user?.firstName ?? "";
  const win = window.open("", "_blank", "width=800,height=650");

  if (!win) {
    toast({
      description: t("payments.toasts.allowPopups"),
      variant: "destructive",
    });
    return;
  }

  win.document.write(`
    <html>
      <head>
        <title>${t("payments.receipt.title")}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #222;
          }
          h1 {
            text-align: center;
            margin-bottom: 5px;
          }
          .subtitle {
            text-align: center;
            margin-bottom: 30px;
          }
          .box {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 6px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .label {
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #777;
          }
        </style>
      </head>
      <body>
        <h1>Konn3ct</h1>
        <p class="subtitle">${t("payments.receipt.title")}</p>

        <div class="box">
          <div class="row">
            <span class="label">${t("payments.receipt.issuedTo")}</span>
            <span>${userLastName} ${userFirstName}</span>
          </div>
          <div class="row">
            <span class="label">${t("payments.receipt.plan")}</span>
            <span>${payment.plan}</span>
          </div>
          <div class="row">
            <span class="label">${t("payments.receipt.paymentType")}</span>
            <span>${payment.type}</span>
          </div>
          <div class="row">
            <span class="label">${t("payments.receipt.paymentMethod")}</span>
            <span>${payment.method}</span>
          </div>
          <div class="row">
            <span class="label">${t("payments.receipt.reference")}</span>
            <span>${payment.reference}</span>
          </div>
          <div class="row">
            <span class="label">${t("payments.receipt.paymentDate")}</span>
            <span>${payment.date}</span>
          </div>
          <div class="row">
            <span class="label">${t("payments.receipt.amountPaid")}</span>
            <span>${payment.currency} ${new Intl.NumberFormat(
    ENGLISH_LOCALE
  ).format(payment.amount)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${t("payments.receipt.footer")}</p>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);

  win.document.close();
};

export const isPlanDisabled = (plan) => {
  const status = String(plan?.status ?? "active").trim().toLowerCase();
  return status === "inactive" || status === "disabled" || status === "0";
};

export const isCustomPlanPrice = (value) => {
  const raw = String(value ?? "").split("/")[0].trim();
  if (!raw) return false;
  if (/^custom(?:\s+pricing)?$/i.test(raw)) return true;
  return Number.isNaN(Number(raw));
};

export const transformPlans = (data, t) => {
  const rawPlanList = Array.isArray(data?.plan) ? data.plan : [];
  const enterpriseExplicitlyDisabled = rawPlanList.some(
    (plan) =>
      String(plan?.name ?? "").trim().toLowerCase() === "enterprise" &&
      isPlanDisabled(plan)
  );
  const planList = rawPlanList.filter((plan) => !isPlanDisabled(plan));
  const yes = t("payments.features.yes");
  const no = t("payments.features.no");

  const buildFeatures = (plan) => [
    t("payments.features.recording", { value: plan.recording ? yes : no }),
    t("payments.features.duration", { value: plan.duration }),
    t("payments.features.participants", { value: plan.participant }),
    t("payments.features.rooms", { value: plan.rooms }),
    t("payments.features.customizeLink", { value: plan.customize_link ? yes : no }),
    t("payments.features.breakoutRooms", { value: plan.breakout_rooms ? yes : no }),
    t("payments.features.accessCode", { value: plan.access_code ? yes : no }),
    t("payments.features.dialIn", { value: plan.dialin ? yes : no }),
  ];

  const resolvePriceAndCta = (plan, rawCost) => {
    const rawPrice = String(rawCost ?? "0").split("/")[0].trim();
    const lowerName = String(plan?.name ?? "").trim().toLowerCase();
    const isFree = lowerName === "basic" || lowerName === "free";

    if (isCustomPlanPrice(rawPrice)) {
      return {
        price: t("payments.planCard.customPrice", "Custom"),
        cta: t("payments.actions.contactSales", "Contact Sales"),
      };
    }

    return {
      price: rawPrice,
      cta: isFree ? t("payments.planCard.free") : t("payments.planCard.upgrade"),
    };
  };

  const monthlyPlans = planList.map((plan) => {
    const { price, cta } = resolvePriceAndCta(plan, plan?.monthly_cost);
    return {
      ...(plan.id !== undefined ? { id: plan.id } : {}),
      name: plan.name,
      price,
      target: t("payments.planCard.targetIndividuals"),
      category: "monthly",
      features: buildFeatures(plan),
      cta,
    };
  });

  const yearlyPlans = planList.map((plan) => {
    const { price, cta } = resolvePriceAndCta(plan, plan?.yearly_cost);
    return {
      ...(plan.id !== undefined ? { id: plan.id } : {}),
      name: plan.name,
      price,
      target: t("payments.planCard.targetIndividuals"),
      category: "yearly",
      features: buildFeatures(plan),
      cta,
    };
  });

  const hasEnterprise = (arr) =>
    arr.some((p) => String(p.name).trim().toLowerCase() === "enterprise");

  const enterprisePlan = {
    name: "enterprise",
    price: t("payments.planCard.customPrice"),
    target: t("payments.planCard.targetEnterprise"),
    features: [t("payments.planCard.customFeatures")],
    cta: t("payments.actions.contactSales"),
  };

  if (!enterpriseExplicitlyDisabled && !hasEnterprise(monthlyPlans)) {
    monthlyPlans.push({ ...enterprisePlan, category: "monthly" });
  }
  if (!enterpriseExplicitlyDisabled && !hasEnterprise(yearlyPlans)) {
    yearlyPlans.push({ ...enterprisePlan, category: "yearly" });
  }

  return { monthly: monthlyPlans, yearly: yearlyPlans };
};

export const applyPlanToProfileCache = (queryClient, plan, verifyResponse) => {
  if (!queryClient || (!plan && !verifyResponse?.user_plan)) return;

  const verifiedPlan = verifyResponse?.user_plan || {
    ...(plan?.id ? { id: Number(plan.id) } : {}),
    ...(plan?.name ? { name: plan.name } : {}),
  };
  const verifiedUser = verifyResponse?.user;

  if (typeof queryClient.setQueryData !== "function") return;

  const updateProfileCache = (prev) => {
    if (!prev || typeof prev !== "object") return prev;
    return {
      ...prev,
      user_plan: {
        ...(prev.user_plan || {}),
        ...verifiedPlan,
        name: verifiedPlan?.name || plan?.name || prev.user_plan?.name,
      },
      user: {
        ...(prev.user || {}),
        ...(verifiedUser || {}),
        status: "active",
        ...(verifiedPlan?.id ? { plan: verifiedPlan.id } : {}),
      },
    };
  };

  queryClient.setQueryData(["profile-dashboard"], updateProfileCache);
  queryClient.setQueryData(["profile"], updateProfileCache);
};

export const invalidateBillingQueries = async (queryClient) => {
  if (!queryClient) return;
  const keys = [
    ["profile-dashboard"],
    ["profile"],
    ["payments"],
    ["plans"],
    ["addons"],
  ];

  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
  );

  if (typeof queryClient.refetchQueries === "function") {
    await Promise.all(
      keys.map((queryKey) =>
        queryClient.refetchQueries({ queryKey, type: "active" })
      )
    );
  }
};

export const runPlanCheckoutFlow = async ({
  plan,
  initializeCheckoutFn = initializeCheckout,
  openPaystackPopupFn = openPaystackPopup,
  verifyCheckoutFn = verifyCheckout,
  queryClient,
  toast,
  t,
  onStart,
  onPlanActivated,
  onFinish,
}) => {
  try {
    if (onStart) onStart();
    const session = await initializeCheckoutFn({
      item_type: "plan",
      ...(plan.id ? { plan_id: Number(plan.id) } : {}),
      plan_name: plan.name,
      billing_cycle: plan.category === "yearly" ? "yearly" : "monthly",
      currency: "NGN",
      provider: "paystack",
    });

    const localReference = session?.local_reference;

    await openPaystackPopupFn({
      accessCode: session?.access_code,
      paymentUrl: session?.payment_url,
      onSuccess: async (tx) => {
        try {
          applyPlanToProfileCache(queryClient, plan);
          if (onPlanActivated) {
            onPlanActivated({ name: plan.name, id: plan.id });
          }

          const refToVerify = localReference || tx?.reference || tx?.trxref;
          let verifyRes = null;
          if (refToVerify) {
            verifyRes = await verifyCheckoutFn(refToVerify);
          }

          applyPlanToProfileCache(queryClient, plan, verifyRes);
          if (onPlanActivated) {
            onPlanActivated({
              name: verifyRes?.user_plan?.name || plan.name,
              id: verifyRes?.user_plan?.id || plan.id,
            });
          }

          await invalidateBillingQueries(queryClient);
          toast({
            description: t("payments.toasts.purchaseSuccessful", "Purchase successful! Your subscription is now active."),
          });
        } catch (verifyError) {
          await invalidateBillingQueries(queryClient);
          toast({
            description:
              verifyError?.response?.data?.message ||
              t("payments.toasts.purchaseSuccessful", "Payment received. Refreshing subscription status..."),
          });
        } finally {
          if (onFinish) onFinish();
        }
      },
      onCancel: async () => {
        try {
          if (localReference) {
            const verifyRes = await verifyCheckoutFn(localReference);
            if (verifyRes?.status === "paid") {
              applyPlanToProfileCache(queryClient, plan, verifyRes);
              if (onPlanActivated) {
                onPlanActivated({
                  name: verifyRes?.user_plan?.name || plan.name,
                  id: verifyRes?.user_plan?.id || plan.id,
                });
              }
              await invalidateBillingQueries(queryClient);
              toast({
                description: t("payments.toasts.purchaseSuccessful", "Purchase successful! Your subscription is now active."),
              });
              return;
            }
          }
          toast({ description: t("payments.toasts.paymentCancelled", "Payment cancelled.") });
        } catch {
          toast({ description: t("payments.toasts.paymentCancelled", "Payment cancelled.") });
        } finally {
          if (onFinish) onFinish();
        }
      },
      onError: (err) => {
        if (onFinish) onFinish();
        toast({
          description:
            err?.response?.data?.message ||
            err?.message ||
            t("payments.states.loadErrorDescription", "Unable to complete payment."),
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
        t("payments.states.loadErrorDescription", "Unable to initialize payment."),
      variant: "destructive",
    });
  }
};

const formatPaymentDate = (value) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : format(parsed, "PPP");
};

const getPlanStyles = (planName) => {
  const lower = planName?.toLowerCase() || "";
  if (lower.includes("basic") || lower.includes("free")) {
    return { color: "border-border", icon: Zap };
  } else if (lower.includes("enterprise") || lower.includes("custom")) {
    return { color: "border-brand-blue", icon: Shield };
  } else {
    // Default / Pro styles
    return { color: "border-brand-green", icon: Crown, popular: true };
  }
};

const Payments = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingPlanKey, setProcessingPlanKey] = useState(null);
  const [activePlanOverride, setActivePlanOverride] = useState(null);
  const verifiedCallbackRef = useRef(false);

  const { data: plansData, isLoading: plansLoading, isError: plansError } = useQuery({
    queryKey: ["plans"],
    queryFn: getPlans,
    select: (response) => transformPlans(response.data, t),
  });

  const { data: userData, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ["profile-dashboard"],
    queryFn: getUser,
  });

  const { data: paymentData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: getList,
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
      .then(async (verifyRes) => {
        if (verifyRes?.user_plan) {
          applyPlanToProfileCache(queryClient, verifyRes.user_plan, verifyRes);
          setActivePlanOverride({
            name: verifyRes.user_plan.name,
            id: verifyRes.user_plan.id,
          });
        }
        await invalidateBillingQueries(queryClient);
        toast({ description: t("payments.toasts.purchaseSuccessful", "Purchase successful!") });
      })
      .catch(async () => {
        await invalidateBillingQueries(queryClient);
      });
  }, [queryClient, t, toast]);

  if (plansLoading || userLoading || paymentsLoading) {
    return (
      <div className="p-6">
        <Skeleton className="w-full h-32 rounded-2xl mb-8" />
        <div className="grid gap-5 md:grid-cols-3 mb-8">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (plansError || userError) {
    return (
      <section className="page container mx-auto !px-4 sm:!px-6 lg:!px-[33px]">
        <Card className="p-6 rounded-2xl">
          <p className="font-medium">{t("payments.states.loadErrorTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("payments.states.loadErrorDescription")}</p>
        </Card>
      </section>
    );
  }

  const currentPlanName = activePlanOverride?.name || userData?.user_plan?.name || "Basic";
  const { icon: PlanIcon } = getPlanStyles(currentPlanName);

  const paymentRows = Array.isArray(paymentData?.payments?.data) ? paymentData.payments.data : [];
  const profileUser = userData?.user ?? {};
  const rawUserStatus = activePlanOverride
    ? "active"
    : String(profileUser.status ?? "active").trim().toLowerCase();
  const isFreePlan = ["basic", "free"].includes(currentPlanName.toLowerCase());
  const isSubscriptionActive = Boolean(activePlanOverride) || isFreePlan || rawUserStatus === "active";

  const handlePlanCheckout = (plan) => {
    const planKey = `${plan.category}-${plan.id ?? plan.name}`;
    runPlanCheckoutFlow({
      plan,
      queryClient,
      toast,
      t,
      onStart: () => setProcessingPlanKey(planKey),
      onPlanActivated: (activatedPlan) => setActivePlanOverride(activatedPlan),
      onFinish: () => setProcessingPlanKey(null),
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-10 px-4 sm:px-6 lg:px-[33px] animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{t("payments.listTitle", "Billing")}</h1>
        <p className="text-muted-foreground mt-1">{t("payments.listSubtitle", "Manage your subscription and billing details.")}</p>
      </div>

      {/* Current Plan Banner */}
      <Card className="rounded-2xl border-brand-green/30 bg-brand-green/5 overflow-hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green text-white shadow-md">
              <PlanIcon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">{capitalize(currentPlanName)} Plan</h2>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase ${
                    isSubscriptionActive
                      ? "bg-brand-green/10 text-brand-green"
                      : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {isSubscriptionActive
                    ? t("payments.currentPlan", "Active")
                    : capitalize(rawUserStatus || "Inactive")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{profileUser.email}</p>
            </div>
          </div>
          <Button className="main-action-button h-11 rounded-xl px-4">
            {t("payments.actions.manageSubscription", "Manage Subscription")}
          </Button>
        </CardContent>
      </Card>

      {/* Plans Section */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-5">{t("payments.actions.changePlan", "Choose a Plan")}</h2>
        
        <Tabs defaultValue={DEFAULT_BILLING_CYCLE} className="flex flex-col">
          <TabsList className="mb-6 self-start grid w-[300px] grid-cols-2 rounded-xl bg-black/[0.04] p-1 h-12">
            <TabsTrigger className="rounded-lg h-full data-[state=active]:bg-surface data-[state=active]:shadow-sm transition-all" value="yearly">
              {t("payments.billingCycle.yearly")}
            </TabsTrigger>
            <TabsTrigger className="rounded-lg h-full data-[state=active]:bg-surface data-[state=active]:shadow-sm transition-all" value="monthly">
              {t("payments.billingCycle.monthly")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="yearly" className="grid gap-5 md:grid-cols-3">
            {plansData?.yearly.map((plan, i) => {
              const planKey = `${plan.category}-${plan.id ?? plan.name}`;
              return (
                <PlanCard
                  key={planKey || i}
                  plan={plan}
                  currentPlanName={currentPlanName}
                  isSubscriptionActive={isSubscriptionActive}
                  isProcessing={processingPlanKey === planKey}
                  onCheckout={handlePlanCheckout}
                  t={t}
                />
              );
            })}
          </TabsContent>

          <TabsContent value="monthly" className="grid gap-5 md:grid-cols-3">
            {plansData?.monthly.map((plan, i) => {
              const planKey = `${plan.category}-${plan.id ?? plan.name}`;
              return (
                <PlanCard
                  key={planKey || i}
                  plan={plan}
                  currentPlanName={currentPlanName}
                  isSubscriptionActive={isSubscriptionActive}
                  isProcessing={processingPlanKey === planKey}
                  onCheckout={handlePlanCheckout}
                  t={t}
                />
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* Invoice History */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-5">{t("payments.listTitle", "Invoice History")}</h2>
        <Card className="rounded-2xl border-border/60 bg-surface overflow-hidden">
          <CardContent className="p-0">
            <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-4 border-b border-border/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div>{t("payments.table.paymentDate")}</div>
              <div>{t("payments.table.plan")}</div>
              <div>{t("payments.table.reference")}</div>
              <div>{t("payments.table.amount")}</div>
              <div className="text-right">{t("payments.table.action")}</div>
            </div>
            
            {paymentRows.map((row) => (
              <div key={row.reference} className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 items-center px-6 py-4 border-b border-border/30 last:border-b-0 hover:bg-black/[0.015] transition-colors">
                <span className="text-sm font-medium text-foreground">{formatPaymentDate(row.date) || t("payments.states.notAvailable")}</span>
                <span className="text-sm text-muted-foreground">{row.plan_details?.name?.toUpperCase()}</span>
                <span className="text-sm text-muted-foreground truncate">{row.reference}</span>
                <span className="text-sm font-semibold text-foreground">{row.currency} {new Intl.NumberFormat(ENGLISH_LOCALE).format(row.amount)}</span>
                <span className="text-right flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold rounded-lg hover:bg-brand-blue/10 hover:text-brand-blue transition-colors"
                    onClick={() => generateReceipt({
                        type: row.type,
                        plan: row.plan_details?.name?.toUpperCase(),
                        method: row.gateway,
                        reference: row.reference,
                        date: row.date,
                        currency: row.currency,
                        amount: row.amount,
                      }, profileUser, toast, t)}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    {t("payments.actions.receipt", "Receipt")}
                  </Button>
                </span>
              </div>
            ))}

            {!paymentRows.length && (
              <div className="py-10 text-center text-muted-foreground text-sm">
                {t("payments.empty")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payments;

const PlanCard = ({ plan, currentPlanName, isSubscriptionActive, isProcessing, onCheckout, t }) => {
  const isCustomPrice = isCustomPlanPrice(plan.price);
  const { color, icon: Icon, popular } = getPlanStyles(
    isCustomPrice ? `${plan.name} custom` : plan.name
  );
  const isCurrent = isSubscriptionActive && currentPlanName.toLowerCase() === plan.name.toLowerCase();
  const isZeroPrice = !isCustomPrice && Number(plan.price) <= 0;

  return (
    <Card className={`rounded-2xl ${color} bg-surface overflow-hidden relative h-full flex flex-col ${popular ? "shadow-lg shadow-brand-green/10" : ""}`}>
      {popular && (
        <div className="absolute top-0 right-0 px-3 py-1 rounded-bl-xl bg-brand-green text-white text-[11px] font-bold uppercase">
          Popular
        </div>
      )}
      <CardContent className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            isCurrent ? "bg-black/[0.04] text-muted-foreground" : popular ? "bg-brand-green text-white" : "bg-brand-blue/10 text-brand-blue"
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{capitalize(plan.name)}</h3>
            <p className="text-xs text-muted-foreground">{plan.target}</p>
          </div>
        </div>

        <div className="mb-6">
          <span className="text-4xl font-extrabold text-foreground">{isCustomPrice ? plan.price : `NGN ${new Intl.NumberFormat(ENGLISH_LOCALE).format(Number(plan.price))}`}</span>
          {!isCustomPrice && <span className="text-muted-foreground text-sm"> / {plan.category === "monthly" ? "mo" : "yr"}</span>}
        </div>

        <ul className="space-y-3 flex-1 mb-6">
          {plan.features.map((feature, j) => (
            <li key={j} className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <div className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
                popular ? "bg-brand-green/10 text-brand-green" : "bg-black/[0.04] text-muted-foreground"
              }`}>
                <Check className="h-3 w-3" />
              </div>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          {isCurrent ? (
            <Button disabled className="w-full h-11 rounded-xl font-semibold opacity-60">
              Current Plan
            </Button>
          ) : isZeroPrice ? (
            <Button disabled className="w-full h-11 rounded-xl font-semibold opacity-60">
              {plan.cta}
            </Button>
          ) : !isCustomPrice ? (
            <Button
              disabled={isProcessing}
              className="main-action-button w-full h-11 rounded-xl font-semibold inline-flex items-center justify-center text-sm"
              onClick={() => onCheckout?.(plan)}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t ? t("payments.actions.processing", "Processing...") : "Processing..."}
                </>
              ) : (
                t ? t("payments.actions.payNow", "Pay Now") : "Pay Now"
              )}
            </Button>
          ) : (
            <Button
              className="main-action-button w-full h-11 rounded-xl font-semibold"
              onClick={() => contactSalesUrl && window.open(contactSalesUrl, "_blank", "noopener,noreferrer")}
            >
              {plan.cta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
