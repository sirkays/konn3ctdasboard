import { api } from ".";

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
