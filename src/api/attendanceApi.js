import { api } from ".";

const API = api;
const AI_BASE_URL = process.env.REACT_APP_API_BOT;

const PLACEHOLDER_ROOM_NAMES = new Set([
  "unknown room",
  "unknown",
  "n/a",
  "na",
  "null",
  "undefined",
]);

const cleanRoomOrMeetingName = (value) => {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return "";
  }

  if (PLACEHOLDER_ROOM_NAMES.has(trimmed.toLowerCase())) {
    return "";
  }

  return trimmed;
};

const normalizeRoomList = (roomsInput) => {
  if (Array.isArray(roomsInput)) {
    return roomsInput;
  }
  if (Array.isArray(roomsInput?.rooms)) {
    return roomsInput.rooms;
  }
  if (Array.isArray(roomsInput?.data?.rooms)) {
    return roomsInput.data.rooms;
  }
  if (Array.isArray(roomsInput?.data)) {
    return roomsInput.data;
  }
  return [];
};

const normalizeMeetingRoomId = (value) => {
  if (value == null) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  const stripped = raw.replace(/^0+(?=\d)/, "");
  return stripped || raw;
};

const extractDirectRoomName = (item) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  const nestedCandidates = [
    typeof item.room_info === "string" ? item.room_info : null,
    item.room_info?.name,
    item.room_info?.room_name,
    item.room_info?.roomName,
    item.room_info?.title,
    typeof item.roomInfo === "string" ? item.roomInfo : null,
    item.roomInfo?.name,
    item.roomInfo?.room_name,
    item.roomInfo?.roomName,
    item.roomInfo?.title,
    typeof item.room === "string" ? item.room : null,
    item.room?.name,
    item.room?.room_name,
    item.room?.roomName,
    item.room?.title,
    typeof item.meeting === "string" ? item.meeting : null,
    item.meeting?.name,
    item.meeting?.room_name,
    item.meeting?.roomName,
    item.meeting?.roomname,
    item.meeting?.title,
  ];

  for (const candidate of nestedCandidates) {
    const cleaned = cleanRoomOrMeetingName(candidate);
    if (cleaned) return cleaned;
  }

  const directRoomFields = [
    item.room_name,
    item.roomName,
    item.roomname,
    item.meeting_name,
    item.meetingName,
    item.meeting_title,
    item.meetingTitle,
    item.title,
    item.keyword,
  ];

  for (const candidate of directRoomFields) {
    const cleaned = cleanRoomOrMeetingName(candidate);
    if (cleaned) return cleaned;
  }

  return "";
};

const findRoomNameById = (item, roomsInput) => {
  const rooms = normalizeRoomList(roomsInput);
  if (rooms.length === 0) {
    return "";
  }

  const targetId = normalizeMeetingRoomId(
    item?.meeting_id ?? item?.room_id ?? item?.meetingId ?? item?.roomId
  );

  if (targetId) {
    const matchedRoom = rooms.find((room) => {
      const roomId = normalizeMeetingRoomId(room?.id ?? room?.room_id ?? room?.meeting_id);
      const roomUrl = String(room?.url ?? "").trim();
      return (roomId && roomId === targetId) || (roomUrl && roomUrl === targetId);
    });

    const matchedName = cleanRoomOrMeetingName(
      matchedRoom?.name ?? matchedRoom?.room_name ?? matchedRoom?.roomName ?? matchedRoom?.title
    );
    if (matchedName) {
      return matchedName;
    }
  }

  return "";
};

export const resolveMeetingRoomName = (item, roomsInput = []) => {
  if (!item || typeof item !== "object") {
    return "";
  }

  const directRoomName = extractDirectRoomName(item);
  if (directRoomName) {
    return directRoomName;
  }

  const matchedRoomName = findRoomNameById(item, roomsInput);
  if (matchedRoomName) {
    return matchedRoomName;
  }

  const fallbackRecordFields = [
    item.name,
    item.host_name,
    item.hostName,
    item.hostname,
    item.host,
    item.attendee_name,
    item.attendeeName,
  ];

  for (const candidate of fallbackRecordFields) {
    const cleaned = cleanRoomOrMeetingName(candidate);
    if (cleaned) {
      return cleaned;
    }
  }

  const rooms = normalizeRoomList(roomsInput);
  if (rooms.length > 0) {
    const defaultRoom =
      rooms.find((room) => String(room?.default_room ?? "").toLowerCase() === "yes") ||
      (rooms.length === 1 ? rooms[0] : null);
    const defaultRoomName = cleanRoomOrMeetingName(
      defaultRoom?.name ?? defaultRoom?.room_name ?? defaultRoom?.title
    );
    if (defaultRoomName) {
      return defaultRoomName;
    }
  }

  const meetingId = cleanRoomOrMeetingName(
    item.meeting_id ?? item.room_id ?? item.meetingId ?? item.id
  );
  if (meetingId) {
    return `Meeting #${meetingId}`;
  }

  return "";
};

export const mapMeetingAttendanceRecord = (item = {}, rooms = []) => {
  const resolvedName = resolveMeetingRoomName(item, rooms);
  const createdAt = item?.created_at ? new Date(item.created_at) : null;
  const hasValidCreatedAt = Boolean(createdAt && !Number.isNaN(createdAt.getTime()));

  return {
    id: item?.id,
    meeting_id: item?.meeting_id ?? item?.room_id ?? item?.meetingId,
    room_name: resolvedName,
    roomName: resolvedName,
    host: resolvedName,
    name: cleanRoomOrMeetingName(item?.name) || resolvedName,
    date: item?.date || (hasValidCreatedAt ? createdAt.toLocaleDateString() : ""),
    time: item?.time || (hasValidCreatedAt ? createdAt.toLocaleTimeString() : ""),
    identifier: item?.identifier,
    status: item?.status,
  };
};

const extractRawAttendanceItems = (payload) => {
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  return [];
};

export const buildMeetingsPage = (payload, rooms = []) => {
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return {
      ...payload,
      data: payload.data.map((item) => mapMeetingAttendanceRecord(item, rooms)),
    };
  }

  if (Array.isArray(payload)) {
    return {
      data: payload.map((item) => mapMeetingAttendanceRecord(item, rooms)),
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null,
      from: payload.length > 0 ? 1 : null,
      per_page: payload.length,
      total: payload.length,
    };
  }

  return {
    data: [],
    current_page: 1,
    last_page: 1,
    next_page_url: null,
    prev_page_url: null,
    from: null,
    per_page: 0,
    total: 0,
  };
};

export const getMeetings = async (page = 1) => {
  try {
    const response = await API.get("/meeting-attendance", {
      params: { page },
    });
    const result = response?.data;
    const rawPayload = result?.data ?? result;
    const rawItems = extractRawAttendanceItems(rawPayload);

    let rooms = [];
    const needsRoomLookup = rawItems.some((item) => !extractDirectRoomName(item));
    if (needsRoomLookup && typeof API?.get === "function") {
      try {
        const roomsResponse = await API.get("/myrooms");
        rooms = normalizeRoomList(roomsResponse?.data?.data ?? roomsResponse?.data);
      } catch {
        rooms = [];
      }
    }

    return buildMeetingsPage(rawPayload, rooms);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    throw error;
  }
};

const buildAttendancePage = (payload) => {
  if (payload && typeof payload === "object" && Array.isArray(payload.data)) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return {
      data: payload,
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null,
      from: payload.length > 0 ? 1 : null,
      per_page: payload.length,
      total: payload.length,
    };
  }

  if (payload && typeof payload === "object") {
    return {
      data: [payload],
      current_page: 1,
      last_page: 1,
      next_page_url: null,
      prev_page_url: null,
      from: 1,
      per_page: 1,
      total: 1,
    };
  }

  return {
    data: [],
    current_page: 1,
    last_page: 1,
    next_page_url: null,
    prev_page_url: null,
    from: null,
    per_page: 0,
    total: 0,
  };
};

export const getAttendanceDetails = async (meeting_id, identifier, page = 1) => {
  if (!meeting_id || !identifier)
    throw new Error("Missing meeting_id or identifier");

  try {
    const response = await API.get(`/attendance-details/${meeting_id}/${identifier}`, {
      params: { page },
    });

    return buildAttendancePage(response.data?.data);
  } catch (error) {
    console.error("Error fetching attendance details:", error);
    throw error;
  }
};


// Meeting Summary
export const getMeetingSummary = async (meetingID) => {
  const res = await fetch(`${AI_BASE_URL}/summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetingID }),
  });

  const data = await res.json();
  return data.message;
};

// Meeting Highlights
export const getMeetingHighlights = async (meetingID) => {
  const res = await fetch(`${AI_BASE_URL}/highlights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetingID }),
  });

  const data = await res.json();
  return data.message;
};
// Meeting minutes
export const getMeetingMinutes = async (meetingID) => {
  const res = await fetch(`${AI_BASE_URL}/minutes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ meetingID }),
  });

  const data = await res.json();
  return data.message;
};
