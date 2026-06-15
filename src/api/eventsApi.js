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

export const getEventList = async () => {
  try {
    const res = await api.get("/event-list");
    return unwrapArray(res.data, ["events"]);
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
    };
  } catch (error) {
    console.error("Error fetching event summary:", error);
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

export const getRooms = async () => {
  try {
    const res = await api.get("/myrooms");
    return res.data.data;
  } catch (error) {
    throw error;
  }
};
