import { api } from ".";

const unwrapData = (payload) => payload?.data ?? payload;

const unwrapArray = (payload) => {
  const data = unwrapData(payload);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.meetings)) return data.meetings;
  if (Array.isArray(data?.today_meetings)) return data.today_meetings;
  if (data?.meeting && typeof data.meeting === "object") return [data.meeting];
  if (data?.today_meeting && typeof data.today_meeting === "object") {
    return [data.today_meeting];
  }

  return [];
};

export const getDashboardStats = async () => {
  const res = await api.get("/dashboard/stats");
  const data = unwrapData(res.data);
  const stats = data?.stats ?? data;

  return stats && typeof stats === "object" && !Array.isArray(stats) ? stats : {};
};

export const getTodayMeetings = async () => {
  const res = await api.get("/dashboard/today-meeting");
  return unwrapArray(res.data);
};
