import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Mail,
  MoreVertical,
  Share2,
  UsersRound,
} from "lucide-react";

import {
  getEventList,
  getEventParticipants,
  sendReminder,
} from "../../api/eventsApi";
import { useToast } from "../../hooks/use-toast";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const CURRENCY_SYMBOLS = {
  NGN: "\u20a6",
  USD: "$",
};

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

const getEventReference = (event) =>
  getFirstValue(event, ["reference", "event_reference", "slug", "id"]);

const getEventTitle = (event) =>
  getFirstValue(event, ["title", "name", "event_title"], "Untitled Event");

const getEventDate = (event) =>
  getFirstValue(event, ["date", "event_date", "start_date", "scheduled_at"]);

const getEventPrice = (event) =>
  toNumber(getFirstValue(event, ["amount", "price", "ticket_price", "registration_fee", "fee"]));

const getEventCurrency = (event) =>
  String(getFirstValue(event, ["currency"], "NGN")).toUpperCase();

const getRegistrationCount = (event, participants) => {
  const count = toNumber(
    getFirstValue(event, [
      "registrations_count",
      "registration_count",
      "total_registrations",
      "registrations",
      "participants_count",
      "attendees_count",
    ])
  );

  return count || participants.length;
};

const isFreeEvent = (event) => {
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

const formatMoney = (value, currency = "NGN") => {
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `;
  return `${symbol}${Math.round(toNumber(value)).toLocaleString("en-US")}`;
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

const getParticipantName = (participant) => {
  const directName = getFirstValue(participant, ["name", "fullname", "full_name"]);
  if (directName) return directName;

  const firstName = getFirstValue(participant, ["firstname", "first_name"]);
  const lastName = getFirstValue(participant, ["lastname", "last_name"]);
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || getFirstValue(participant, ["email"], "Guest");
};

const getPaymentStatus = (participant, event) => {
  const status = String(
    getFirstValue(participant, [
      "payment_status",
      "paymentStatus",
      "status",
      "transaction_status",
    ])
  );

  if (status) return status;
  if (isFreeEvent(event)) return "Paid";

  return participant?.paid_at || participant?.payment?.paid_at ? "Paid" : "Pending";
};

const getStatusClassName = (status) => {
  const normalized = String(status).toLowerCase();

  if (normalized.includes("paid") || normalized.includes("success") || normalized.includes("free")) {
    return {
      dot: "bg-brand-green",
      text: "text-brand-green",
      label: "Paid",
    };
  }

  return {
    dot: "bg-[#ff920a]",
    text: "text-[#ff920a]",
    label: "Pending",
  };
};

const EventDetail = () => {
  const { reference } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminderLoading, setReminderLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadEventDetail = async () => {
      try {
        setLoading(true);
        const [eventList, participantList] = await Promise.all([
          getEventList(),
          getEventParticipants(reference).catch((error) => {
            console.error("Failed to load event attendees:", error);
            return [];
          }),
        ]);

        const selectedEvent = (Array.isArray(eventList) ? eventList : []).find(
          (item) => String(getEventReference(item)) === String(reference)
        );

        if (!cancelled) {
          setEvent(selectedEvent ?? null);
          setParticipants(Array.isArray(participantList) ? participantList : []);
        }
      } catch (error) {
        console.error("Error loading event detail:", error);
        if (!cancelled) {
          toast({
            description: "Unable to load event details right now.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (reference) {
      loadEventDetail();
    }

    return () => {
      cancelled = true;
    };
  }, [reference, toast]);

  const attendeeRows = useMemo(
    () =>
      participants.map((participant, index) => {
        const status = getPaymentStatus(participant, event ?? {});

        return {
          id: getFirstValue(participant, ["id", "reference", "email"], index),
          name: getParticipantName(participant),
          email: getFirstValue(participant, ["email"], "-"),
          date: formatDate(getFirstValue(participant, ["created_at", "registered_at", "date"])),
          status,
        };
      }),
    [event, participants]
  );

  const free = isFreeEvent(event ?? {});
  const currency = getEventCurrency(event ?? {});
  const ticketPrice = getEventPrice(event ?? {});
  const registrations = getRegistrationCount(event ?? {}, participants);
  const totalRevenue = free
    ? 0
    : toNumber(getFirstValue(event, ["revenue", "total_revenue", "totalRevenue", "amount_paid"])) ||
      ticketPrice * registrations;
  const paidRegistrations = attendeeRows.filter((row) =>
    String(row.status).toLowerCase().includes("paid")
  ).length;
  const explicitConversion = getFirstValue(event, [
    "page_conversion",
    "pageConversion",
    "conversion",
    "conversion_rate",
  ]);
  const conversion =
    explicitConversion !== ""
      ? toNumber(explicitConversion)
      : registrations > 0
        ? Math.round((paidRegistrations / registrations) * 100)
        : 0;

  const copyRegistrationLink = async () => {
    const url = getFirstValue(event, ["event_url", "url", "registration_url", "link"]);
    if (!url) {
      toast({
        description: "No registration link is available for this event.",
        variant: "destructive",
      });
      return;
    }

    await navigator.clipboard.writeText(url);
    toast({ description: "Registration link copied to clipboard." });
  };

  const sendReminderToAttendees = async () => {
    try {
      setReminderLoading(true);
      const response = await sendReminder(reference);
      toast({
        description: response?.message || "Reminder sent to attendees.",
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
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
      <div className="flex h-[calc(100vh-100px)] w-full items-center justify-center">
        <p className="text-sm font-medium text-muted-foreground animate-pulse">
          Loading event details...
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-[calc(100vh-100px)] w-full flex-col items-center justify-center gap-4">
        <p className="text-xl font-extrabold text-foreground">Event not found</p>
        <Button onClick={() => navigate("/events")} className="rounded-xl bg-brand-blue text-white hover:bg-brand-blue/90">
          Back to Events
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <button
            type="button"
            onClick={() => navigate("/events")}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-black/[0.04] hover:text-foreground"
            aria-label="Back to events"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[32px] font-extrabold leading-tight tracking-normal text-foreground">
                {getEventTitle(event)}
              </h1>
              <span className="rounded-full bg-[#fff1de] px-3 py-1 text-xs font-bold text-[#e57700]">
                {free ? "Free" : "Paid"}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-lg font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Scheduled for {formatDate(getEventDate(event))}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={copyRegistrationLink}
          className="h-[50px] w-full rounded-xl bg-brand-blue px-6 text-base font-bold text-white shadow-[0_14px_28px_rgba(0,44,136,0.2)] hover:bg-brand-blue/90 sm:w-auto"
        >
          <Share2 className="h-5 w-5" />
          Share Registration Link
        </Button>
      </div>

      <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: UsersRound,
            value: registrations.toLocaleString("en-US"),
            label: "Total Registrations",
            iconClassName: "bg-brand-blue/10 text-brand-blue",
          },
          {
            icon: DollarSign,
            value: free ? "-" : formatMoney(ticketPrice, currency),
            label: "Ticket Price",
            iconClassName: "bg-[#ff920a]/10 text-[#ff920a]",
          },
          {
            icon: CheckCircle2,
            value: formatMoney(totalRevenue, currency),
            label: "Total Revenue",
            iconClassName: "bg-brand-green/10 text-brand-green",
          },
          {
            icon: Clock3,
            value: `${conversion}%`,
            label: "Page Conversion",
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

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-extrabold tracking-normal text-foreground">
            Attendees
          </h2>
          <Button
            variant="outline"
            onClick={sendReminderToAttendees}
            disabled={reminderLoading || attendeeRows.length === 0}
            className="h-10 rounded-xl border-border/70 bg-surface px-4 text-base font-semibold text-foreground shadow-sm hover:bg-muted/30"
          >
            <Mail className="h-4 w-4" />
            {reminderLoading ? "Sending..." : "Send Reminder"}
          </Button>
        </div>

        <Card className="overflow-hidden rounded-xl border-border/60 bg-surface p-0 shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1.6fr_1.1fr_1fr_90px] border-b border-border/50 px-7 py-4 text-xs font-extrabold uppercase tracking-normal text-muted-foreground">
                <div>Attendee</div>
                <div>Registration Date</div>
                <div>Payment</div>
                <div className="text-right">Actions</div>
              </div>

              <div className="divide-y divide-border/40">
                {attendeeRows.length === 0 ? (
                  <div className="px-7 py-12 text-center text-sm font-medium text-muted-foreground">
                    No attendees have registered yet.
                  </div>
                ) : (
                  attendeeRows.map((attendee) => {
                    const statusClassName = getStatusClassName(attendee.status);

                    return (
                      <div
                        key={attendee.id}
                        className="grid grid-cols-[1.6fr_1.1fr_1fr_90px] items-center px-7 py-5 transition-colors hover:bg-black/[0.01]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-base font-extrabold leading-tight text-foreground">
                            {attendee.name}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-muted-foreground">
                            {attendee.email}
                          </p>
                        </div>
                        <div className="text-base font-medium text-muted-foreground">
                          {attendee.date}
                        </div>
                        <div className={`flex items-center gap-2 text-sm font-semibold ${statusClassName.text}`}>
                          <span className={`h-2 w-2 rounded-full ${statusClassName.dot}`} />
                          <span>{statusClassName.label}</span>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            aria-label={`Actions for ${attendee.name}`}
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
          </div>
        </Card>
      </section>
    </div>
  );
};

export default EventDetail;
