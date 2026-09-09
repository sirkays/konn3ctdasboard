const readEnv = (value) => (value ?? "").trim();

export const normalizeKonn3ctDomain = (url) => {
  if (!url || typeof url !== "string") return "";
  return url.replace(/konn3ct\.com/gi, "konn3ct.ng");
};

export const normalizeYouTubeEmbedUrl = (value) => {
  const nextValue = readEnv(value);

  if (!nextValue) {
    return "";
  }

  try {
    const url = new URL(nextValue);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const videoId = url.searchParams.get("v");

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }

      if (url.pathname.startsWith("/embed/")) {
        return nextValue;
      }
    }

    if (host === "youtu.be") {
      const videoId = url.pathname.replace(/^\//, "");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
  } catch (error) {
    return "";
  }

  return nextValue;
};

export const DEFAULT_PRIVACY_POLICY_URL = "https://konn3ct.ng";

export const getPrivacyPolicyUrl = (customUrl) => {
  const raw = readEnv(customUrl) || readEnv(process.env.REACT_APP_PRIVACY_POLICY_URL);
  if (!raw) {
    return DEFAULT_PRIVACY_POLICY_URL;
  }
  const normalizedDomain = raw.replace(/konn3ct\.com/gi, "konn3ct.ng");
  const withProtocol = /^https?:\/\//i.test(normalizedDomain) ? normalizedDomain : `https://${normalizedDomain}`;
  return withProtocol.replace(/\/+$/, "");
};

export const privacyPolicyUrl = getPrivacyPolicyUrl();

export const googleUserInfoUrl = readEnv(
  process.env.REACT_APP_GOOGLE_USERINFO_URL
);
export const facebookSdkUrl = readEnv(process.env.REACT_APP_FACEBOOK_SDK_URL);
export const gettingStartedVideoUrl = normalizeYouTubeEmbedUrl(
  process.env.REACT_APP_GETTING_STARTED_VIDEO_URL
);

export const DEFAULT_CONTACT_SALES_URL = "https://konn3ct.ng/contact";

export const getContactSalesUrl = (customUrl) => {
  const raw = readEnv(customUrl) || readEnv(process.env.REACT_APP_CONTACT_SALES_URL);
  if (!raw) {
    return DEFAULT_CONTACT_SALES_URL;
  }
  const normalizedDomain = raw.replace(/konn3ct\.com/gi, "konn3ct.ng");
  const withProtocol = /^https?:\/\//i.test(normalizedDomain) ? normalizedDomain : `https://${normalizedDomain}`;
  return withProtocol.replace(/\/+$/, "");
};

export const contactSalesUrl = getContactSalesUrl();

export const DEFAULT_LANDING_URL = "https://konn3ct.ng";

export const getLandingUrl = (customUrl) => {
  const raw = readEnv(customUrl) || readEnv(process.env.REACT_APP_LANDING_URL);
  if (!raw) {
    return DEFAULT_LANDING_URL;
  }
  const normalizedDomain = raw.replace(/konn3ct\.com/gi, "konn3ct.ng");
  const withProtocol = /^https?:\/\//i.test(normalizedDomain) ? normalizedDomain : `https://${normalizedDomain}`;
  return withProtocol.replace(/\/+$/, "");
};

export const landingUrl = getLandingUrl();

export const DEFAULT_EVENT_URL = "https://www.konn3ct.ng/event";

export const getEventBaseUrl = (customBaseUrl) => {
  const raw = readEnv(customBaseUrl) || readEnv(process.env.REACT_APP_EVENT_URL);
  if (!raw) {
    return DEFAULT_EVENT_URL;
  }
  const normalizedDomain = raw.replace(/konn3ct\.com/gi, "konn3ct.ng");
  const withProtocol = /^https?:\/\//i.test(normalizedDomain) ? normalizedDomain : `https://${normalizedDomain}`;
  const trimmed = withProtocol.replace(/\/+$/, "");
  return trimmed.toLowerCase().endsWith("/event") ? trimmed : `${trimmed}/event`;
};

export const buildEventRegistrationUrl = (reference, rawUrl) => {
  const cleanRef = String(reference ?? "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  const cleanRawUrl = readEnv(rawUrl);

  let refToUse = cleanRef;
  if (!refToUse && cleanRawUrl) {
    try {
      const parsed = new URL(cleanRawUrl);
      const segments = parsed.pathname.split("/").filter(Boolean);
      refToUse = segments[segments.length - 1] || "";
    } catch {
      const segments = cleanRawUrl.split("/").filter(Boolean);
      refToUse = segments[segments.length - 1] || "";
    }
  }

  if (refToUse) {
    const base = getEventBaseUrl();
    return `${base}/${refToUse}`;
  }

  if (cleanRawUrl) {
    return cleanRawUrl.replace(/konn3ct\.com/gi, "konn3ct.ng");
  }

  return "";
};

export const DEFAULT_JOIN_MEETING_URL = "https://edge.konn3ct.net/join";
export const DEFAULT_FLAG_URL = "https://k4.edge.konn3ct.net/join";

export const getFlagUrl = () => {
  const raw = readEnv(process.env.REACT_APP_FLAG_URL) || readEnv(process.env.FLAG_URL);
  return raw || DEFAULT_FLAG_URL;
};

export const isFlagUrl = (url, customFlagUrl) => {
  if (!url || typeof url !== "string") return false;

  const flag = readEnv(customFlagUrl) || getFlagUrl();
  if (!flag) return false;

  const normalize = (val) =>
    val
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");

  const normalizedFlag = normalize(flag);
  const normalizedUrl = normalize(url);

  if (!normalizedFlag || !normalizedUrl) return false;

  if (normalizedUrl === normalizedFlag) return true;
  if (normalizedUrl.startsWith(`${normalizedFlag}/`)) return true;

  return false;
};

export const isBackendUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase();

  const backendBase = readEnv(process.env.REACT_APP_BASE_BACKENED_URL).toLowerCase();
  if (backendBase && lower.includes(backendBase.replace(/\/+$/, ""))) return true;

  const baseApi = readEnv(process.env.REACT_APP_BASE_URL).toLowerCase();
  if (baseApi && lower.includes(baseApi.replace(/\/+$/, ""))) return true;

  return /127\.0\.0\.1:8080|localhost:8080/.test(lower);
};

export const getJoinMeetingBaseUrl = (customBaseUrl) => {
  const raw = readEnv(customBaseUrl) || readEnv(process.env.REACT_APP_JOIN_MEETING_URL);

  if (!raw || isBackendUrl(raw) || isFlagUrl(raw)) {
    return DEFAULT_JOIN_MEETING_URL;
  }

  const normalizedDomain = raw.replace(/konn3ct\.(?:com|ng)/gi, "edge.konn3ct.net");
  const withProtocol = /^https?:\/\//i.test(normalizedDomain) ? normalizedDomain : `https://${normalizedDomain}`;
  const trimmed = withProtocol.replace(/\/+$/, "");

  if (trimmed.toLowerCase().endsWith("/join")) {
    return trimmed;
  }

  return `${trimmed}/join`;
};

export const getJoinMeetingDisplayPrefix = (customBaseUrl) => {
  const baseUrl = getJoinMeetingBaseUrl(customBaseUrl);
  const withoutProtocol = baseUrl.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return `${withoutProtocol}/`;
};

export const buildRoomJoinUrl = (roomSlug, roomLinkTemplate) => {
  const cleanSlug = String(roomSlug ?? "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  if (!cleanSlug) {
    return "";
  }

  const envJoinUrl = readEnv(process.env.REACT_APP_JOIN_MEETING_URL);
  if (envJoinUrl && !isBackendUrl(envJoinUrl) && !isFlagUrl(envJoinUrl)) {
    return `${getJoinMeetingBaseUrl(envJoinUrl)}/${cleanSlug}`;
  }

  const template = readEnv(roomLinkTemplate);
  if (template && !isBackendUrl(template) && !isFlagUrl(template)) {
    const normalizedTemplate = template.replace(/konn3ct\.(?:com|ng)/gi, "edge.konn3ct.net");
    if (normalizedTemplate.includes("replaceRoomURL")) {
      return normalizedTemplate.replace("replaceRoomURL", cleanSlug);
    }
    const cleanTemplate = normalizedTemplate.replace(/\/+$/, "");
    if (cleanTemplate.toLowerCase().endsWith("/join")) {
      return `${cleanTemplate}/${cleanSlug}`;
    }
    return `${cleanTemplate}/join/${cleanSlug}`;
  }

  return `${getJoinMeetingBaseUrl()}/${cleanSlug}`;
};

export const buildJoinMeetingUrl = (sessionToken) => {
  const rawUrl = readEnv(process.env.REACT_APP_JOIN_MEETING_URL);
  const baseToUse = (rawUrl && !isBackendUrl(rawUrl) && !isFlagUrl(rawUrl))
    ? rawUrl
    : DEFAULT_JOIN_MEETING_URL;
  const meetingUrl = baseToUse.replace(/konn3ct\.(?:com|ng)/gi, "edge.konn3ct.net");
  if (!meetingUrl || !sessionToken) {
    return "";
  }

  try {
    const url = new URL(meetingUrl);
    url.searchParams.set("sessionToken", sessionToken);
    return url.toString();
  } catch (error) {
    return "";
  }
};

export const normalizeMeetingUrl = (url, slug = "") => {
  const raw = readEnv(url);
  if (!raw) {
    return slug ? buildRoomJoinUrl(slug) : "";
  }

  if (isBackendUrl(raw) || isFlagUrl(raw)) {
    const slugMatch = raw.match(/\/join\/([^/?#]+)/i);
    const extractedSlug = slugMatch?.[1] || slug;
    return extractedSlug ? buildRoomJoinUrl(extractedSlug) : getJoinMeetingBaseUrl();
  }

  if (/\/join(?:\/|$)/i.test(raw)) {
    return raw.replace(/konn3ct\.(?:com|ng)/gi, "edge.konn3ct.net");
  }

  return raw.replace(/konn3ct\.com/gi, "konn3ct.ng");
};

