import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  DollarSign,
  Globe2,
  Mail,
  MoreVertical,
  Plus,
  UsersRound,
} from "lucide-react";

import {
  getEventList,
  getEventParticipants,
  getEventRecentRegistrations,
  getEventSummary,
  sendReminder,
} from "../../api/eventsApi";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";

const CURRENCY_SYMBOLS = {
  NGN: "\u20a6",
  USD: "$",
};
const EVENTS_PAGE_SIZE = 2;

const getFirstValue = (source, keys, fallback = "") => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
};

const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? "").replace(/[^\d.-]/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const getRegistrationCount = (event) =>
  toNumber(
    getFirstValue(event, [
      "registrations_count",
      "registration_count",
      "total_registrations",
      "registrations",
      "participants_count",
      "attendees_count",
    ])
  );

const isFreeEvent = (event) => {
  if (!event || typeof event !== "object" || Object.keys(event).length === 0) {
    return false;
  }

  const freeValue = getFirstValue(event, ["free", "is_free", "isFree"]);
  const price = getEventPrice(event);

  if (typeof freeValue === "boolean") return freeValue;
  if (String(freeValue).toLowerCase() === "true") return true;
  if (String(freeValue) === "1") return true;
  if (String(freeValue) === "0") return false;

  const type = String(getFirstValue(event, ["type", "ticket_type", "event_type"])).toLowerCase();
  if (type.includes("free")) return true;
  if (type.includes("paid")) return false;

  return price === 0;
};

const getEventPrice = (event) =>
  toNumber(getFirstValue(event, ["amount", "price", "ticket_price", "registration_fee", "fee"]));

const getEventCurrency = (event) =>
  String(getFirstValue(event, ["currency"], "NGN")).toUpperCase();

const formatMoney = (value, currency = "NGN") => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${Math.round(toNumber(value)).toLocaleString("en-US")}`;
};

const formatCompactMoney = (value, currency = "NGN") => {
  const amount = toNumber(value);
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;

  if (amount >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  }

  if (amount >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
  }

  return `${symbol}${Math.round(amount).toLocaleString("en-US")}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const getEventRevenue = (event) => {
  const explicitRevenue = toNumber(
    getFirstValue(event, ["revenue", "total_revenue", "totalRevenue", "amount_paid"])
  );

  if (explicitRevenue > 0) return explicitRevenue;
  if (isFreeEvent(event)) return 0;

  return getEventPrice(event) * getRegistrationCount(event);
};

const getEventReference = (event) =>
  getFirstValue(event, ["reference", "event_reference", "slug", "id"]);

const getEventTitle = (event) =>
  getFirstValue(event, ["title", "name", "event_title"], "Untitled Event");

const getParticipantName = (participant) => {
  const directName = getFirstValue(participant, ["name", "fullname", "full_name"]);
  if (directName) return directName;

  const firstName = getFirstValue(participant, ["firstname", "first_name"]);
  const lastName = getFirstValue(participant, ["lastname", "last_name"]);
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || getFirstValue(participant, ["email"], "Guest");
};

const getRegistrationEvent = (registration) =>
  registration?.event ||
  registration?.pre_reg ||
  registration?.preReg ||
  registration?.prereg ||
  null;

const getRegistrationEventTitle = (registration) => {
  const directTitle = getFirstValue(
    registration,
    ["event_title", "eventTitle", "title", "event_name", "eventName"]
  );
  if (directTitle) return directTitle;

  const event = getRegistrationEvent(registration);
  return getEventTitle(event);
};

const normalizeRecentRegistration = (registration, index = 0) => {
  const event = getRegistrationEvent(registration);
  return {
    id: getFirstValue(registration, ["id", "reference", "email"], index),
    name: getParticipantName(registration),
    email: getFirstValue(registration, ["email"], "-"),
    eventTitle: getRegistrationEventTitle(registration),
    status: getPaymentStatus(registration, event),
    createdAt: getFirstValue(registration, ["created_at", "registered_at", "date"]),
  };
};

const getPaymentStatus = (participant, event) => {
  const status = String(
    getFirstValue(participant, [
      "payment_status",
      "paymentStatus",
      "status",
      "transaction_status",
    ])
  ).trim();

  if (
    status &&
    !["0", "1", "null", "undefined"].includes(status.toLowerCase())
  ) {
    const lower = status.toLowerCase();
    if (lower.includes("paid") || lower.includes("success")) return "Paid";
    if (lower.includes("free")) return "Free";
    if (lower.includes("pending")) return "Pending";
    if (lower.includes("fail")) return "Failed";
    return status;
  }

  if (isFreeEvent(event)) return "Free";

  const isPaid =
    participant?.paid === 1 ||
    participant?.paid === "1" ||
    participant?.paid === true ||
    !!participant?.paid_at ||
    !!participant?.payment?.paid_at;

  return isPaid ? "Paid" : "Pending";
};

const getStatusClassName = (status) => {
  const normalized = String(status).toLowerCase();

  if (normalized.includes("paid") || normalized.includes("success") || normalized.includes("free")) {
    return {
      dot: "bg-brand-green",
      text: "text-brand-green",
    };
  }

  return {
    dot: "bg-amber-500",
    text: "text-amber-500",
  };
};

const EventDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState({
    activeEvents: 0,
    totalRegistrations: 0,
  });
  const [recentRegistrations, setRecentRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminderLoading, setReminderLoading] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        const [listResponse, summaryResponse, recentResponse] = await Promise.all([
          getEventList(),
          getEventSummary(),
          getEventRecentRegistrations().catch((error) => {
            console.error("Failed to load recent event registrations:", error);
            return [];
          }),
        ]);
        const eventList = Array.isArray(listResponse) ? listResponse : [];
        let registrations = Array.isArray(recentResponse)
          ? recentResponse.map(normalizeRecentRegistration)
          : [];

        if (registrations.length === 0) {
          const participantResults = await Promise.all(
            eventList
              .filter((event) => getEventReference(event))
              .slice(0, 4)
              .map(async (event) => {
                try {
                  const participants = await getEventParticipants(getEventReference(event));
                  return (participants || []).map((participant, participantIndex) => ({
                    id: `${getEventReference(event)}-${getFirstValue(
                      participant,
                      ["id", "reference", "email"],
                      participantIndex
                    )}`,
                    name: getParticipantName(participant),
                    email: getFirstValue(participant, ["email"], "-"),
                    eventTitle: getEventTitle(event),
                    status: getPaymentStatus(participant, event),
                    createdAt: getFirstValue(participant, ["created_at", "registered_at", "date"]),
                  }));
                } catch (error) {
                  console.error("Failed to load event participants:", error);
                  return [];
                }
              })
          );

          registrations = participantResults.flat();
        }

        registrations = registrations
          .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
          .slice(0, 3);

        if (!cancelled) {
          setEvents(eventList);
          setSummary({
            activeEvents: summaryResponse?.activeEvents ?? eventList.length,
            totalRegistrations:
              summaryResponse?.totalRegistrations ??
              eventList.reduce((total, event) => total + getRegistrationCount(event), 0),
            revenue30d: summaryResponse?.revenue30d ?? 0,
            payoutStatus: summaryResponse?.payoutStatus ?? "",
          });
          setRecentRegistrations(registrations);
        }
      } catch (error) {
        console.error("Error loading event dashboard:", error);
        if (!cancelled) {
          toast({
            description: "Unable to load event dashboard right now.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const totalEventPages = Math.max(1, Math.ceil(events.length / EVENTS_PAGE_SIZE));
  const eventsToShow = useMemo(() => {
    const pageStart = (eventsPage - 1) * EVENTS_PAGE_SIZE;
    return events.slice(pageStart, pageStart + EVENTS_PAGE_SIZE);
  }, [events, eventsPage]);
  const totalRevenue = useMemo(
    () =>
      summary.revenue30d > 0
        ? summary.revenue30d
        : events.reduce((total, event) => total + getEventRevenue(event), 0),
    [events, summary.revenue30d]
  );
  const reminderEvent = useMemo(
    () => events.find((event) => getEventReference(event)),
    [events]
  );

  useEffect(() => {
    setEventsPage((page) => Math.min(page, totalEventPages));
  }, [totalEventPages]);

  const handleSendReminder = async () => {
    if (!reminderEvent) {
      toast({
        description: "Create an event before sending reminders.",
        variant: "destructive",
      });
      return;
    }

    try {
      setReminderLoading(true);
      const response = await sendReminder(getEventReference(reminderEvent));
      toast({
        description: response?.message || `Reminder sent for ${getEventTitle(reminderEvent)}.`,
      });
    } catch (error) {
      console.error("Error sending event reminder:", error);
      toast({
        description: "Failed to send reminder.",
        variant: "destructive",
      });
    } finally {
      setReminderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full space-y-8 animate-pulse">
        <div className="h-20 w-full max-w-md rounded-2xl bg-muted/60" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-24 rounded-2xl bg-muted/60" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="h-44 rounded-2xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-normal text-foreground">
            Virtual Events
          </h1>
          <p className="mt-2 text-lg font-medium text-muted-foreground">
            Host paid webinars and manage registered attendees.
          </p>
        </div>

        <Button
          onClick={() => navigate("/events/create")}
          className="main-action-button h-11 w-full rounded-xl px-5 text-sm font-bold sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: Globe2,
            value: summary.activeEvents,
            label: "Active Events",
            iconClassName: "bg-brand-blue/10 text-brand-blue",
          },
          {
            icon: UsersRound,
            value: summary.totalRegistrations,
            label: "Total Registrations",
            iconClassName: "bg-brand-green/10 text-brand-green",
          },
          {
            icon: DollarSign,
            value: formatCompactMoney(totalRevenue),
            label: "Revenue (30d)",
            iconClassName: "bg-[#ff920a]/10 text-[#ff920a]",
          },
          {
            icon: CreditCard,
            value: summary.payoutStatus || "Ready",
            label: "Payouts",
            iconClassName: "bg-purple-500/10 text-purple-500",
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className="flex min-h-[92px] items-center gap-4 rounded-xl border-border/60 bg-surface p-5 shadow-sm"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.iconClassName}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[28px] font-extrabold leading-none tracking-normal text-foreground">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="mb-5 text-2xl font-extrabold tracking-normal text-foreground">Your Events</h2>

        {eventsToShow.length === 0 ? (
          <Card className="rounded-xl border-border/60 bg-surface p-10 text-center shadow-sm">
            <p className="text-lg font-bold text-foreground">No events yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first virtual event to start accepting registrations.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              {eventsToShow.map((event) => {
                const free = isFreeEvent(event);
                const currency = getEventCurrency(event);
                const price = getEventPrice(event);
                const revenue = getEventRevenue(event);
                const reference = getEventReference(event);

                return (
                  <Card
                    key={reference}
                    role="button"
                    tabIndex={0}
                    onClick={() => reference && navigate(`/events/detail/${reference}`)}
                    onKeyDown={(eventKey) => {
                      if ((eventKey.key === "Enter" || eventKey.key === " ") && reference) {
                        eventKey.preventDefault();
                        navigate(`/events/detail/${reference}`);
                      }
                    }}
                    className="cursor-pointer rounded-xl border-border/60 bg-surface p-6 shadow-[0_18px_34px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-[0_22px_38px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/30"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-extrabold tracking-normal text-foreground">
                          {getEventTitle(event)}
                        </h3>
                        <div className="mt-3 flex items-center gap-2 text-base font-medium text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(getFirstValue(event, ["date", "event_date", "start_date"]))}</span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          free
                            ? "bg-brand-green/10 text-brand-green"
                            : "bg-[#ff920a]/10 text-[#e57700]"
                        }`}
                      >
                        {free ? "Free" : "Paid"}
                      </span>
                    </div>

                    <div className="border-t border-border/50 pt-5">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Registrations</p>
                          <p className="mt-1 text-base font-extrabold text-foreground">
                            {getRegistrationCount(event).toLocaleString("en-US")}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Price</p>
                          <p className="mt-1 text-base font-extrabold text-foreground">
                            {free ? "-" : formatMoney(price, currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                          <p className="mt-1 text-base font-extrabold text-brand-green">
                            {revenue > 0 ? formatMoney(revenue, currency) : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {totalEventPages > 1 && (
              <div className="mt-5 flex items-center justify-center">
                <Pagination className="w-auto rounded-full border border-border/60 bg-surface px-2 py-1 shadow-sm">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setEventsPage((page) => Math.max(1, page - 1))}
                        disabled={eventsPage === 1}
                        className="h-8 rounded-full px-3 text-sm disabled:pointer-events-none disabled:opacity-50"
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <span className="flex h-8 items-center px-3 text-sm font-semibold text-foreground">
                        {eventsPage}
                        <span className="ml-1 font-medium text-muted-foreground">/ {totalEventPages}</span>
                      </span>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setEventsPage((page) => Math.min(totalEventPages, page + 1))}
                        disabled={eventsPage === totalEventPages}
                        className="h-8 rounded-full px-3 text-sm disabled:pointer-events-none disabled:opacity-50"
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-extrabold tracking-normal text-foreground">
            Recent Registrations
          </h2>
          <Button
            variant="outline"
            disabled={reminderLoading || !reminderEvent}
            onClick={handleSendReminder}
            className="h-10 rounded-xl border-border/70 bg-surface px-4 text-base font-semibold text-foreground shadow-sm hover:bg-muted/30"
          >
            <Mail className="h-4 w-4" />
            {reminderLoading ? "Sending..." : "Send Reminder"}
          </Button>
        </div>

        <Card className="overflow-hidden rounded-xl border-border/60 bg-surface p-0 shadow-sm">
          <div className="grid min-w-[760px] grid-cols-[1.6fr_1.6fr_1fr_90px] border-b border-border/50 px-7 py-4 text-xs font-extrabold uppercase tracking-normal text-muted-foreground">
            <div>Attendee</div>
            <div>Event</div>
            <div>Payment</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px] divide-y divide-border/40">
              {recentRegistrations.length === 0 ? (
                <div className="px-7 py-12 text-center text-sm font-medium text-muted-foreground">
                  No recent registrations yet.
                </div>
              ) : (
                recentRegistrations.map((registration) => {
                  const statusClassName = getStatusClassName(registration.status);

                  return (
                    <div
                      key={registration.id}
                      className="grid grid-cols-[1.6fr_1.6fr_1fr_90px] items-center px-7 py-5 transition-colors hover:bg-black/[0.01]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-extrabold text-foreground">
                          {registration.name}
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                          {registration.email}
                        </p>
                      </div>
                      <div className="truncate text-base font-medium text-muted-foreground">
                        {registration.eventTitle}
                      </div>
                      <div className={`flex items-center gap-2 text-sm font-semibold ${statusClassName.text}`}>
                        <span className={`h-2 w-2 rounded-full ${statusClassName.dot}`} />
                        <span>{registration.status}</span>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          aria-label={`Actions for ${registration.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};

export default EventDashboard;
