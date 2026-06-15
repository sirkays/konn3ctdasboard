import { api } from ".";

export const getInvites = async (page) => {
  try {
    const res = await api.get(`/invites?page=${page}`);
    return res.data.data;
  } catch (error) {
    throw error;
  }
};

export const resendInvite = async (id) => {
  try {
    const res = await api.put(`/resendinvites/${id}`);
    return res.data;
  } catch (error) {
    throw error;
  }
};

export const sendInvite = async (data) => {
  try {
    const res = await api.post(`/invite`, data);
    return res.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error(
        "The scheduling endpoint is unavailable on the server. Expected POST /api/app/invite."
      );
    }

    throw error;
  }
};
