import { api } from ".";

export const inviteTeamMember = async (data) => {
  const res = await api.post("/teams/invite", data);
  return res.data;
};

export const fetchTeamList = async () => {
  const res = await api.get("/teams/list");
  return res.data;
};

export const updateTeamMemberRole = async ({ id, role }) => {
  const res = await api.put(`/teams/update-role/${id}`, { role });
  return res.data;
};

export const removeTeamMember = async (id) => {
  const res = await api.delete(`/teams/remove/${id}`);
  return res.data;
};

export const suspendTeamMember = async (id) => {
  const res = await api.put(`/teams/suspend/${id}`);
  return res.data;
};

export const unsuspendTeamMember = async (id) => {
  const res = await api.put(`/teams/unsuspend/${id}`);
  return res.data;
};

export const resetTeamMemberPassword = async ({ id, password }) => {
  const res = await api.put(`/teams/reset-password/${id}`, { password });
  return res.data;
};

export const fetchTeamMemberProfile = async (id) => {
  const res = await api.get(`/teams/profile/${id}`);
  return res.data;
};

export const fetchTeamMemberRooms = async (id) => {
  const res = await api.get(`/teams/rooms/${id}`);
  return res.data;
};

export const fetchTeamMemberRecordings = async (id) => {
  const res = await api.get(`/teams/recordings/${id}`);
  return res.data;
};

export const fetchTeamMemberSessions = async (id) => {
  const res = await api.get(`/teams/sessions/${id}`);
  return res.data;
};

export const checkTeamInviteToken = async (token) => {
  const res = await api.get(`/teams/check-token/${token}`);
  return res.data;
};

export const activateTeamInvite = async (token) => {
  const res = await api.get(`/teams/activate/${token}`);
  return res.data;
};
