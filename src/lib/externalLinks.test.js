import {
  DEFAULT_LANDING_URL,
  getLandingUrl,
  DEFAULT_JOIN_MEETING_URL,
  DEFAULT_FLAG_URL,
  getFlagUrl,
  isFlagUrl,
  isBackendUrl,
  getJoinMeetingBaseUrl,
  getJoinMeetingDisplayPrefix,
  buildRoomJoinUrl,
  buildJoinMeetingUrl,
  DEFAULT_EVENT_URL,
  getEventBaseUrl,
  buildEventRegistrationUrl,
  DEFAULT_PRIVACY_POLICY_URL,
  getPrivacyPolicyUrl,
  normalizeYouTubeEmbedUrl,
  DEFAULT_CONTACT_SALES_URL,
  getContactSalesUrl,
  normalizeMeetingHost,
  extractRoomSlug,
  normalizeKonn3ctDomain,
  normalizeMeetingUrl,
} from "./externalLinks";

describe("externalLinks meeting join and event URL helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REACT_APP_LANDING_URL;
    delete process.env.REACT_APP_JOIN_MEETING_URL;
    delete process.env.REACT_APP_BASE_BACKENED_URL;
    delete process.env.REACT_APP_BASE_URL;
    delete process.env.REACT_APP_EVENT_URL;
    delete process.env.REACT_APP_PRIVACY_POLICY_URL;
    delete process.env.REACT_APP_GETTING_STARTED_VIDEO_URL;
    delete process.env.REACT_APP_CONTACT_SALES_URL;
    delete process.env.REACT_APP_FLAG_URL;
    delete process.env.FLAG_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("landing URL helpers", () => {
    it("defaults DEFAULT_LANDING_URL to https://konn3ct.ng", () => {
      expect(DEFAULT_LANDING_URL).toBe("https://konn3ct.ng");
    });

    it("falls back to https://konn3ct.ng when REACT_APP_LANDING_URL is not set", () => {
      expect(getLandingUrl()).toBe("https://konn3ct.ng");
      expect(getLandingUrl("")).toBe("https://konn3ct.ng");
    });

    it("uses REACT_APP_LANDING_URL when set", () => {
      process.env.REACT_APP_LANDING_URL = "https://custom.konn3ct.ng";
      expect(getLandingUrl()).toBe("https://custom.konn3ct.ng");
    });

    it("strips trailing slashes from landing URL", () => {
      expect(getLandingUrl("https://konn3ct.ng/")).toBe("https://konn3ct.ng");
    });

    it("prepends https protocol if omitted", () => {
      expect(getLandingUrl("konn3ct.ng")).toBe("https://konn3ct.ng");
    });
  });

  describe("DEFAULT_JOIN_MEETING_URL", () => {
    it("defaults to https://edge.konn3ct.net/join", () => {
      expect(DEFAULT_JOIN_MEETING_URL).toBe("https://edge.konn3ct.net/join");
    });
  });

  describe("isBackendUrl", () => {
    it("detects 127.0.0.1 and localhost on local backend ports (8000, 8080, 8081)", () => {
      expect(isBackendUrl("http://127.0.0.1:8080/join/abc")).toBe(true);
      expect(isBackendUrl("http://localhost:8080/api/app")).toBe(true);
      expect(isBackendUrl("https://127.0.0.1:8080")).toBe(true);
      expect(isBackendUrl("http://127.0.0.1:8081/join/abc")).toBe(true);
      expect(isBackendUrl("http://localhost:8081/api/app")).toBe(true);
      expect(isBackendUrl("http://127.0.0.1:8000/api/app")).toBe(true);
    });

    it("detects URLs matching REACT_APP_BASE_BACKENED_URL or REACT_APP_BASE_URL", () => {
      process.env.REACT_APP_BASE_BACKENED_URL = "https://backend-internal.konn3ct.ng/";
      process.env.REACT_APP_BASE_URL = "https://api-internal.konn3ct.ng/api";

      expect(isBackendUrl("https://backend-internal.konn3ct.ng/join/abc")).toBe(true);
      expect(isBackendUrl("https://api-internal.konn3ct.ng/api/rooms")).toBe(true);
    });

    it("returns false for legitimate public join URLs", () => {
      expect(isBackendUrl("https://edge.konn3ct.net/join")).toBe(false);
      expect(isBackendUrl("https://konn3ct.ng/join")).toBe(false);
      expect(isBackendUrl("https://konn3ct.com/join")).toBe(false);
    });

    it("handles null or undefined input gracefully", () => {
      expect(isBackendUrl(null)).toBe(false);
      expect(isBackendUrl(undefined)).toBe(false);
      expect(isBackendUrl("")).toBe(false);
    });
  });

  describe("getJoinMeetingBaseUrl", () => {
    it("falls back to https://edge.konn3ct.net/join when no env var is set", () => {
      expect(getJoinMeetingBaseUrl()).toBe("https://edge.konn3ct.net/join");
    });

    it("falls back to default if configured URL is a backend URL", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "http://127.0.0.1:8080/join";
      expect(getJoinMeetingBaseUrl()).toBe("https://edge.konn3ct.net/join");
    });

    it("normalizes and appends /join when missing", () => {
      expect(getJoinMeetingBaseUrl("https://edge.konn3ct.net")).toBe("https://edge.konn3ct.net/join");
      expect(getJoinMeetingBaseUrl("https://edge.konn3ct.net/")).toBe("https://edge.konn3ct.net/join");
    });

    it("normalizes legacy konn3ct.com and konn3ct.ng to edge.konn3ct.net", () => {
      expect(getJoinMeetingBaseUrl("https://konn3ct.com/join")).toBe("https://edge.konn3ct.net/join");
      expect(getJoinMeetingBaseUrl("https://konn3ct.ng/join/")).toBe("https://edge.konn3ct.net/join");
    });

    it("adds https protocol if omitted", () => {
      expect(getJoinMeetingBaseUrl("edge.konn3ct.net")).toBe("https://edge.konn3ct.net/join");
    });
  });

  describe("getJoinMeetingDisplayPrefix", () => {
    it("returns edge.konn3ct.net/join/ by default", () => {
      expect(getJoinMeetingDisplayPrefix()).toBe("edge.konn3ct.net/join/");
    });

    it("normalizes konn3ct.com and konn3ct.ng to edge.konn3ct.net/join/ in display prefix", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "https://konn3ct.com/join";
      expect(getJoinMeetingDisplayPrefix()).toBe("edge.konn3ct.net/join/");
      process.env.REACT_APP_JOIN_MEETING_URL = "https://konn3ct.ng/join";
      expect(getJoinMeetingDisplayPrefix()).toBe("edge.konn3ct.net/join/");
    });

    it("derives prefix from REACT_APP_JOIN_MEETING_URL when pointing to custom host", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "https://custom-edge.konn3ct.io/join";
      expect(getJoinMeetingDisplayPrefix()).toBe("custom-edge.konn3ct.io/join/");
    });

    it("never shows backend base URL in prefix", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "http://127.0.0.1:8080/";
      expect(getJoinMeetingDisplayPrefix()).toBe("edge.konn3ct.net/join/");
    });
  });

  describe("buildRoomJoinUrl", () => {
    it("returns empty string when room slug is empty", () => {
      expect(buildRoomJoinUrl("")).toBe("");
      expect(buildRoomJoinUrl(null)).toBe("");
      expect(buildRoomJoinUrl(undefined)).toBe("");
    });

    it("falls back to https://edge.konn3ct.net/join/<slug> when env is not set", () => {
      expect(buildRoomJoinUrl("Abd6ba630")).toBe("https://edge.konn3ct.net/join/Abd6ba630");
    });

    it("normalizes legacy konn3ct.com / konn3ct.ng in REACT_APP_JOIN_MEETING_URL to edge.konn3ct.net", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "https://konn3ct.com/join";
      expect(buildRoomJoinUrl("Abd6ba630")).toBe("https://edge.konn3ct.net/join/Abd6ba630");
      process.env.REACT_APP_JOIN_MEETING_URL = "https://konn3ct.ng/join";
      expect(buildRoomJoinUrl("Abd6ba630")).toBe("https://edge.konn3ct.net/join/Abd6ba630");
    });

    it("uses REACT_APP_JOIN_MEETING_URL if defined", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "https://edge.konn3ct.net/join";
      expect(buildRoomJoinUrl("Abd6ba630")).toBe("https://edge.konn3ct.net/join/Abd6ba630");
    });

    it("trims leading and trailing slashes from slug", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "https://edge.konn3ct.net/join";
      expect(buildRoomJoinUrl("/Abd6ba630/")).toBe("https://edge.konn3ct.net/join/Abd6ba630");
    });

    it("uses roomLinkTemplate with replaceRoomURL when REACT_APP_JOIN_MEETING_URL is not set", () => {
      const template = "https://edge.konn3ct.net/join/replaceRoomURL";
      expect(buildRoomJoinUrl("Abd6ba630", template)).toBe("https://edge.konn3ct.net/join/Abd6ba630");
    });

    it("rejects backend URL template and falls back to default https://edge.konn3ct.net/join/<slug>", () => {
      const backendTemplate = "http://127.0.0.1:8080/join/replaceRoomURL";
      expect(buildRoomJoinUrl("Abd6ba630", backendTemplate)).toBe("https://edge.konn3ct.net/join/Abd6ba630");
    });
  });

  describe("buildJoinMeetingUrl", () => {
    it("builds session token URL defaulting to edge.konn3ct.net", () => {
      const tokenUrl = buildJoinMeetingUrl("token-xyz");
      expect(tokenUrl).toBe("https://edge.konn3ct.net/join?sessionToken=token-xyz");
    });

    it("returns empty string when no session token is passed", () => {
      expect(buildJoinMeetingUrl("")).toBe("");
      expect(buildJoinMeetingUrl(null)).toBe("");
    });
  });

  describe("getEventBaseUrl", () => {
    it("returns DEFAULT_EVENT_URL (https://www.konn3ct.ng/event) by default", () => {
      expect(getEventBaseUrl()).toBe(DEFAULT_EVENT_URL);
      expect(DEFAULT_EVENT_URL).toBe("https://www.konn3ct.ng/event");
    });

    it("uses REACT_APP_EVENT_URL when set", () => {
      process.env.REACT_APP_EVENT_URL = "https://events.konn3ct.ng/event";
      expect(getEventBaseUrl()).toBe("https://events.konn3ct.ng/event");
    });

    it("appends /event if missing in REACT_APP_EVENT_URL", () => {
      process.env.REACT_APP_EVENT_URL = "https://events.konn3ct.ng";
      expect(getEventBaseUrl()).toBe("https://events.konn3ct.ng/event");
    });

    it("normalizes legacy konn3ct.com to konn3ct.ng in REACT_APP_EVENT_URL", () => {
      process.env.REACT_APP_EVENT_URL = "https://www.konn3ct.com/event";
      expect(getEventBaseUrl()).toBe("https://www.konn3ct.ng/event");
    });
  });

  describe("buildEventRegistrationUrl", () => {
    it("builds event registration URL from reference defaulting to https://www.konn3ct.ng/event/<ref>", () => {
      expect(buildEventRegistrationUrl("dpxB0rUDyz8KYc1XxaHI")).toBe(
        "https://www.konn3ct.ng/event/dpxB0rUDyz8KYc1XxaHI"
      );
    });

    it("normalizes legacy backend URL with konn3ct.com to konn3ct.ng", () => {
      const legacyBackendUrl = "https://www.konn3ct.com/event/dpxB0rUDyz8KYc1XxaHI";
      expect(buildEventRegistrationUrl(null, legacyBackendUrl)).toBe(
        "https://www.konn3ct.ng/event/dpxB0rUDyz8KYc1XxaHI"
      );
    });

    it("prioritizes explicit reference over rawUrl reference if provided", () => {
      expect(
        buildEventRegistrationUrl("newRef123", "https://www.konn3ct.com/event/oldRef456")
      ).toBe("https://www.konn3ct.ng/event/newRef123");
    });

    it("trims slashes from reference", () => {
      expect(buildEventRegistrationUrl("/dpxB0rUDyz8KYc1XxaHI/")).toBe(
        "https://www.konn3ct.ng/event/dpxB0rUDyz8KYc1XxaHI"
      );
    });

    it("respects custom REACT_APP_EVENT_URL", () => {
      process.env.REACT_APP_EVENT_URL = "https://edge-events.konn3ct.net";
      expect(buildEventRegistrationUrl("dpxB0rUDyz8KYc1XxaHI")).toBe(
        "https://edge-events.konn3ct.net/event/dpxB0rUDyz8KYc1XxaHI"
      );
    });

    it("returns empty string when both reference and rawUrl are empty", () => {
      expect(buildEventRegistrationUrl("", "")).toBe("");
      expect(buildEventRegistrationUrl(null, null)).toBe("");
    });
  });

  describe("privacyPolicyUrl helpers", () => {
    it("defaults to https://landing.konn3ct.ng/privacy when env is not set", () => {
      expect(DEFAULT_PRIVACY_POLICY_URL).toBe("https://landing.konn3ct.ng/privacy");
      expect(getPrivacyPolicyUrl()).toBe("https://landing.konn3ct.ng/privacy");
      expect(getPrivacyPolicyUrl("")).toBe("https://landing.konn3ct.ng/privacy");
    });

    it("falls back to https://landing.konn3ct.ng/privacy for legacy root or broken endpoints", () => {
      process.env.REACT_APP_PRIVACY_POLICY_URL = "https://konn3ct.ng";
      expect(getPrivacyPolicyUrl()).toBe("https://landing.konn3ct.ng/privacy");

      process.env.REACT_APP_PRIVACY_POLICY_URL = "https://konn3ct.ng/privacy";
      expect(getPrivacyPolicyUrl()).toBe("https://landing.konn3ct.ng/privacy");
    });

    it("uses custom REACT_APP_PRIVACY_POLICY_URL when set", () => {
      process.env.REACT_APP_PRIVACY_POLICY_URL = "https://landing.konn3ct.ng/privacy";
      expect(getPrivacyPolicyUrl()).toBe("https://landing.konn3ct.ng/privacy");
    });

    it("normalizes legacy konn3ct.com to konn3ct.ng in privacy policy URL", () => {
      process.env.REACT_APP_PRIVACY_POLICY_URL = "https://custom.konn3ct.com/privacy-terms";
      expect(getPrivacyPolicyUrl()).toBe("https://custom.konn3ct.ng/privacy-terms");
    });
  });

  describe("normalizeYouTubeEmbedUrl (Tutorial / Getting Started Video)", () => {
    it("returns empty string when no URL is provided (no default fallback)", () => {
      expect(normalizeYouTubeEmbedUrl("")).toBe("");
      expect(normalizeYouTubeEmbedUrl(null)).toBe("");
      expect(normalizeYouTubeEmbedUrl(undefined)).toBe("");
    });

    it("normalizes youtube.com/watch?v=... to embed URL", () => {
      expect(normalizeYouTubeEmbedUrl("https://www.youtube.com/watch?v=eTFcF4cgNn0")).toBe(
        "https://www.youtube.com/embed/eTFcF4cgNn0"
      );
    });

    it("normalizes youtu.be/... to embed URL", () => {
      expect(normalizeYouTubeEmbedUrl("https://youtu.be/eTFcF4cgNn0")).toBe(
        "https://www.youtube.com/embed/eTFcF4cgNn0"
      );
    });

    it("leaves valid embed URLs intact", () => {
      expect(normalizeYouTubeEmbedUrl("https://www.youtube.com/embed/eTFcF4cgNn0")).toBe(
        "https://www.youtube.com/embed/eTFcF4cgNn0"
      );
    });
  });

  describe("contactSalesUrl helpers", () => {
    it("defaults to https://konn3ct.ng/contact when env is unset", () => {
      expect(DEFAULT_CONTACT_SALES_URL).toBe("https://konn3ct.ng/contact");
      expect(getContactSalesUrl()).toBe("https://konn3ct.ng/contact");
    });

    it("uses REACT_APP_CONTACT_SALES_URL when set", () => {
      process.env.REACT_APP_CONTACT_SALES_URL = "https://custom.konn3ct.ng/sales";
      expect(getContactSalesUrl()).toBe("https://custom.konn3ct.ng/sales");
    });

    it("normalizes legacy konn3ct.com to konn3ct.ng in contact sales URL", () => {
      process.env.REACT_APP_CONTACT_SALES_URL = "https://konn3ct.com/contact";
      expect(getContactSalesUrl()).toBe("https://konn3ct.ng/contact");
    });
  });

  describe("normalizeKonn3ctDomain", () => {
    it("replaces konn3ct.com with konn3ct.ng", () => {
      expect(normalizeKonn3ctDomain("https://konn3ct.com/pricing")).toBe("https://konn3ct.ng/pricing");
      expect(normalizeKonn3ctDomain("https://www.konn3ct.com/about")).toBe("https://www.konn3ct.ng/about");
    });

    it("returns empty string for empty input", () => {
      expect(normalizeKonn3ctDomain("")).toBe("");
      expect(normalizeKonn3ctDomain(null)).toBe("");
    });
  });

  describe("normalizeMeetingUrl", () => {
    it("converts backend local URL to https://edge.konn3ct.net/join/<slug>", () => {
      expect(normalizeMeetingUrl("http://127.0.0.1:8080/join/test-room")).toBe(
        "https://edge.konn3ct.net/join/test-room"
      );
    });

    it("normalizes legacy konn3ct.com join URL to edge.konn3ct.net/join/<slug>", () => {
      expect(normalizeMeetingUrl("https://konn3ct.com/join/my-room")).toBe(
        "https://edge.konn3ct.net/join/my-room"
      );
    });

    it("leaves edge.konn3ct.net join URL intact", () => {
      expect(normalizeMeetingUrl("https://edge.konn3ct.net/join/my-room")).toBe(
        "https://edge.konn3ct.net/join/my-room"
      );
    });

    it("builds from slug if raw URL is empty", () => {
      expect(normalizeMeetingUrl("", "fallback-room")).toBe(
        "https://edge.konn3ct.net/join/fallback-room"
      );
    });
  });

  describe("FLAG_URL detection and fallback to DEFAULT_JOIN_MEETING_URL", () => {
    it("defaults DEFAULT_FLAG_URL to https://k4.edge.konn3ct.net/join", () => {
      expect(DEFAULT_FLAG_URL).toBe("https://k4.edge.konn3ct.net/join");
      expect(getFlagUrl()).toBe("https://k4.edge.konn3ct.net/join");
    });

    it("reads custom FLAG_URL or REACT_APP_FLAG_URL when set in environment", () => {
      process.env.REACT_APP_FLAG_URL = "https://custom-flag.konn3ct.net/join";
      expect(getFlagUrl()).toBe("https://custom-flag.konn3ct.net/join");

      delete process.env.REACT_APP_FLAG_URL;
      process.env.FLAG_URL = "https://flag-only.konn3ct.net/join";
      expect(getFlagUrl()).toBe("https://flag-only.konn3ct.net/join");
    });

    it("identifies matching flag URLs accurately with isFlagUrl including variations without /join", () => {
      expect(isFlagUrl("https://k4.edge.konn3ct.net/join")).toBe(true);
      expect(isFlagUrl("https://k4.edge.konn3ct.net/join/")).toBe(true);
      expect(isFlagUrl("http://k4.edge.konn3ct.net/join")).toBe(true);
      expect(isFlagUrl("https://k4.edge.konn3ct.net")).toBe(true);
      expect(isFlagUrl("https://k4.edge.konn3ct.net/")).toBe(true);
      expect(isFlagUrl("k4.edge.konn3ct.net")).toBe(true);
      expect(isFlagUrl("https://k4.edge.konn3ct.net/room/replaceRoomURL")).toBe(true);
      expect(isFlagUrl("https://k4.edge.konn3ct.net/replaceRoomURL")).toBe(true);
      expect(isFlagUrl("https://k4.edge.konn3ct.net/join/Abd6ba630")).toBe(true);
      expect(isFlagUrl("https://k4.edge.konn3ct.net/join/replaceRoomURL")).toBe(true);
      expect(isFlagUrl("https://edge.konn3ct.net/join")).toBe(false);
      expect(isFlagUrl("https://edge.konn3ct.net/join/Abd6ba630")).toBe(false);
    });

    it("falls back getJoinMeetingBaseUrl to https://edge.konn3ct.net/join when base url matches FLAG_URL or k4", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "https://k4.edge.konn3ct.net/join";
      expect(getJoinMeetingBaseUrl()).toBe("https://edge.konn3ct.net/join");
      expect(getJoinMeetingBaseUrl("https://k4.edge.konn3ct.net/join")).toBe("https://edge.konn3ct.net/join");
      expect(getJoinMeetingBaseUrl("https://k4.edge.konn3ct.net")).toBe("https://edge.konn3ct.net/join");
      expect(getJoinMeetingDisplayPrefix()).toBe("edge.konn3ct.net/join/");
    });

    it("falls back buildRoomJoinUrl to https://edge.konn3ct.net/join/<slug> when REACT_APP_JOIN_MEETING_URL matches FLAG_URL or k4", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "https://k4.edge.konn3ct.net/join";
      expect(buildRoomJoinUrl("Abd6ba630")).toBe("https://edge.konn3ct.net/join/Abd6ba630");

      process.env.REACT_APP_JOIN_MEETING_URL = "https://k4.edge.konn3ct.net";
      expect(buildRoomJoinUrl("konn3ct-conversations-2026")).toBe(
        "https://edge.konn3ct.net/join/konn3ct-conversations-2026"
      );
    });

    it("extracts slug and builds room URL correctly even if roomSlug is a full URL", () => {
      expect(
        buildRoomJoinUrl("https://k4.edge.konn3ct.net/join/konn3ct-conversations-2026")
      ).toBe("https://edge.konn3ct.net/join/konn3ct-conversations-2026");

      expect(
        buildRoomJoinUrl("/join/konn3ct-conversations-2026/")
      ).toBe("https://edge.konn3ct.net/join/konn3ct-conversations-2026");
    });

    it("rejects roomLinkTemplate matching FLAG_URL or k4 and falls back to default join URL", () => {
      const template = "https://k4.edge.konn3ct.net/join/replaceRoomURL";
      expect(buildRoomJoinUrl("Abd6ba630", template)).toBe("https://edge.konn3ct.net/join/Abd6ba630");

      const directTemplate = "https://k4.edge.konn3ct.net/join";
      expect(buildRoomJoinUrl("Abd6ba630", directTemplate)).toBe("https://edge.konn3ct.net/join/Abd6ba630");

      const noJoinTemplate = "https://k4.edge.konn3ct.net/replaceRoomURL";
      expect(buildRoomJoinUrl("konn3ct-conversations-2026", noJoinTemplate)).toBe(
        "https://edge.konn3ct.net/join/konn3ct-conversations-2026"
      );
    });

    it("falls back buildJoinMeetingUrl to DEFAULT_JOIN_MEETING_URL when REACT_APP_JOIN_MEETING_URL matches FLAG_URL or k4", () => {
      process.env.REACT_APP_JOIN_MEETING_URL = "https://k4.edge.konn3ct.net/join";
      expect(buildJoinMeetingUrl("token-123")).toBe("https://edge.konn3ct.net/join?sessionToken=token-123");

      process.env.REACT_APP_JOIN_MEETING_URL = "https://k4.edge.konn3ct.net";
      expect(buildJoinMeetingUrl("token-456")).toBe("https://edge.konn3ct.net/join?sessionToken=token-456");
    });

    it("normalizes meeting URL matching FLAG_URL or k4 to edge.konn3ct.net/join/<slug>", () => {
      expect(normalizeMeetingUrl("https://k4.edge.konn3ct.net/join/Abd6ba630")).toBe(
        "https://edge.konn3ct.net/join/Abd6ba630"
      );
      expect(normalizeMeetingUrl("https://k4.edge.konn3ct.net/join", "fallback-slug")).toBe(
        "https://edge.konn3ct.net/join/fallback-slug"
      );
      expect(normalizeMeetingUrl("https://k4.edge.konn3ct.net/join/konn3ct-conversations-2026")).toBe(
        "https://edge.konn3ct.net/join/konn3ct-conversations-2026"
      );
    });

    it("normalizes k4.edge.konn3ct.net to edge.konn3ct.net with normalizeMeetingHost", () => {
      expect(normalizeMeetingHost("https://k4.edge.konn3ct.net/join/xyz")).toBe(
        "https://edge.konn3ct.net/join/xyz"
      );
      expect(normalizeMeetingHost("https://konn3ct.com/join/xyz")).toBe(
        "https://edge.konn3ct.net/join/xyz"
      );
    });

    it("extracts room slug accurately with extractRoomSlug", () => {
      expect(extractRoomSlug("konn3ct-conversations-2026")).toBe("konn3ct-conversations-2026");
      expect(extractRoomSlug("https://k4.edge.konn3ct.net/join/konn3ct-conversations-2026")).toBe(
        "konn3ct-conversations-2026"
      );
      expect(extractRoomSlug("/join/konn3ct-conversations-2026/")).toBe("konn3ct-conversations-2026");
      expect(extractRoomSlug("")).toBe("");
      expect(extractRoomSlug(null)).toBe("");
    });
  });
});
