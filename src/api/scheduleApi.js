import { api } from ".";
import { createPreRegEvent } from "./eventsApi";

export const getSchedules = async (params) => {
  try {
    const res = await api.get("/schedule", { params });
    return res.data?.data ?? res.data;
  } catch (error) {
    throw error;
  }
};

export const createSchedule = async (data) => {
  try {
    const res = await api.post("/schedule", data);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const getScheduleRecentEmails = async () => {
  try {
    const res = await api.get("/schedule-recent-emails");
    return res.data?.data ?? res.data;
  } catch (error) {
    throw error;
  }
};

export const updateSchedule = async ({ id, data }) => {
  try {
    const res = await api.put(`/schedule-edit/${id}`, data);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const cancelSchedule = async (id) => {
  try {
    const res = await api.delete(`/schedule-cancel/${id}`);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const resendScheduleInvite = async (id) => {
  try {
    const res = await api.put(`/resendinvites/${id}`);
    return res.data;
  } catch (error) {
    throw error;
  }
};

/**
 * Creates a webinar schedule by:
 * 1. Creating the schedule invite (POST /schedule)
 * 2. Creating the pre-registration event page (POST /pre-reg)
 *
 * @param {Object} schedulePayload - Standard schedule fields
 * @param {FormData} preRegFormData - Pre-registration event fields (multipart)
 * @returns {Object} Combined result with schedule and event data
 */
export const createWebinarSchedule = async (schedulePayload, preRegFormData) => {
  try {
    // Step 1: Create the schedule invite
    const scheduleRes = await api.post("/schedule", schedulePayload);
    const scheduleData = scheduleRes.data;

    if (scheduleData?.success === false || scheduleData?.status === false) {
      return scheduleData;
    }

    // Step 2: Create the pre-registration event page
    const eventRes = await createPreRegEvent(preRegFormData);

    return {
      ...scheduleData,
      event: eventRes,
      eventReference: eventRes?.data?.reference ?? eventRes?.reference ?? null,
    };
  } catch (error) {
    throw error;
  }
};
