import { api } from ".";

const unwrapArray = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;

  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;

  for (const key of keys) {
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
    if (Array.isArray(payload?.data?.[key]?.data)) return payload.data[key].data;
  }

  return [];
};

const getPaginationMeta = (payload) => {
  if (Array.isArray(payload)) return null;

  if (Array.isArray(payload?.data?.data)) return payload.data;
  if (Array.isArray(payload?.data)) return payload;

  return null;
};

export const getEventList = async () => {
  try {
    const events = [];
    let page = 1;
    let hasNextPage = true;
    const MAX_EVENT_PAGES = 50;

    while (hasNextPage && page <= MAX_EVENT_PAGES) {
      const res = await api.get("/event-list", {
        params: {
          page,
        },
      });
      const pageEvents = unwrapArray(res.data, ["events"]);
      const pagination = getPaginationMeta(res.data);

      events.push(...pageEvents);

      if (!pagination) {
        hasNextPage = false;
      } else {
        const currentPage = Number(pagination.current_page ?? page);
        const lastPage = Number(pagination.last_page ?? 0);

        hasNextPage = lastPage > 0
          ? currentPage < lastPage
          : Boolean(pagination.next_page_url);
        page = currentPage + 1;
      }
    }

    return events;
  } catch (error) {
    console.error("Error fetching event list:", error);
    throw error;
  }
};

export const getEventSummary = async () => {
  try {
    const res = await api.get("/event-summary");
    const summary = res.data?.data ?? {};

    return {
      activeEvents: Number(summary.active_events ?? 0),
      totalRegistrations: Number(summary.total_registrations ?? 0),
      revenue30d: Number(
        summary.revenue_30d ??
          summary.revenue ??
          summary.total_revenue ??
          0
      ),
      payoutStatus: summary.payout_status ?? summary.payoutStatus ?? "",
    };
  } catch (error) {
    console.error("Error fetching event summary:", error);
    throw error;
  }
};

export const getEventRecentRegistrations = async () => {
  try {
    const res = await api.get("/event-recent-registrations");
    return unwrapArray(res.data, ["registrations", "recent_registrations", "users"]);
  } catch (error) {
    console.error("Error fetching recent event registrations:", error);
    throw error;
  }
};

export const getEventParticipants = async (reference) => {
  try {
    const res = await api.get(`/event-participants/${reference}`);
    return unwrapArray(res.data, ["users", "participants"]);
  } catch (error) {
    console.error("Failed to fetch event participants:", error);
    throw error;
  }
};

export const sendReminder = async (reference) => {
  try {
    const res = await api.post(`/sendPreregReminder/${reference}`, {});
    return res.data;
  } catch (error) {
    console.error("Failed to send Reminder:", error);
    throw error;
  }
};

export const createPreRegEvent = async (formData) => {
  try {
    const isFormData = formData instanceof FormData;
    const config = {};
    if (!isFormData) {
      config.headers = { "Content-Type": "application/json" };
    }

    const res = await api.post("/pre-reg", formData, config);
    return res.data;
  } catch (error) {
    console.error("Error creating pre-registration event:", error);
    throw error;
  }
};

export const updatePreRegEvent = async (reference, formData) => {
  try {
    const isFormData = formData instanceof FormData;
    if (isFormData && reference && !formData.get("reference")) {
      formData.append("reference", reference);
    }
    const config = {};
    if (!isFormData) {
      config.headers = { "Content-Type": "application/json" };
    }

    const encodedRef = encodeURIComponent(reference || "");
    const res = await api.post(`/pre-reg/update/${encodedRef}`, formData, config);
    return res.data;
  } catch (error) {
    console.error("Error updating pre-registration event:", error);
    throw error;
  }
};

export const getRooms = async () => {
  try {
    const res = await api.get("/myrooms");
    return res.data.data;
  } catch (error) {
    throw error;
  }
};
