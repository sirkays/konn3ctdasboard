import { api } from ".";

const unwrapTokenCollection = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.tokens)) return payload.tokens;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const fetchApiTokens = async () => {
  const response = await api.get("/token");
  return unwrapTokenCollection(response.data);
};

export const createApiToken = async (name) => {
  const response = await api.post("/token", { name });
  return response.data;
};

export const deleteApiToken = async (tokenId) => {
  const response = await api.delete("/token", {
    data: { token_id: String(tokenId) },
  });
  return response.data;
};
