import { api } from ".";

export const getSchedules = async () => {
  try {
    const res = await api.get("/schedule");
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
