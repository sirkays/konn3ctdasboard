import React, { act } from "react";
import { createRoot } from "react-dom/client";
import AttendanceList from "./AttendanceList";
import {
  buildMeetingsPage,
  getMeetings,
  mapMeetingAttendanceRecord,
  resolveMeetingRoomName,
} from "../../api/attendanceApi";
import { api } from "../../api";

jest.mock("../../api", () => ({
  api: {
    get: jest.fn(),
  },
}));

const mockNavigate = jest.fn();
jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

const mockT = (key, fallback) => (typeof fallback === "string" ? fallback : key);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

describe("Attendance room and meeting name resolution", () => {
  let host;
  let root;

  beforeEach(() => {
    jest.clearAllMocks();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
  });

  test("resolves room name from nested room_info, roomInfo, room, or direct room fields", () => {
    expect(
      resolveMeetingRoomName({
        id: 1,
        meeting_id: 10,
        room_info: { id: 10, name: "Product Strategy Room" },
        name: "Atteh Kayode",
      })
    ).toBe("Product Strategy Room");

    expect(
      resolveMeetingRoomName({
        id: 2,
        meeting_id: 11,
        roomInfo: { id: 11, name: "Engineering Sync" },
      })
    ).toBe("Engineering Sync");

    expect(
      resolveMeetingRoomName({
        id: 3,
        meeting_id: 12,
        room: { id: 12, name: "Boardroom Alpha" },
      })
    ).toBe("Boardroom Alpha");

    expect(
      resolveMeetingRoomName({
        id: 4,
        meeting_id: 13,
        room_name: "Design Critique",
      })
    ).toBe("Design Critique");
  });

  test("resolves room name from rooms list by meeting_id or falls back to attendance record name when room_info is null", () => {
    const rooms = [
      { id: 42, name: "Weekly Standup Room", default_room: "no" },
      { id: 99, name: "Personal Default Room", default_room: "yes" },
    ];

    // Matches room 42 even with leading zero in meeting_id
    expect(
      resolveMeetingRoomName(
        {
          id: 10,
          meeting_id: "042",
          room_info: null,
          name: "Atteh Kayode",
        },
        rooms
      )
    ).toBe("Weekly Standup Room");

    // When room_info is null and room 68 was deleted, falls back to record's meeting/host name instead of "Unknown Room"
    expect(
      resolveMeetingRoomName(
        {
          id: 11,
          meeting_id: 68,
          room_info: null,
          name: "Quarterly Planning Session",
        },
        rooms
      )
    ).toBe("Quarterly Planning Session");

    // Ignores "Unknown Room" placeholder if present on host field
    expect(
      resolveMeetingRoomName({
        id: 12,
        meeting_id: 70,
        host: "Unknown Room",
        name: "Executive Briefing",
      })
    ).toBe("Executive Briefing");
  });

  test("mapMeetingAttendanceRecord and buildMeetingsPage never produce Unknown Room", () => {
    const page = buildMeetingsPage({
      current_page: 1,
      last_page: 1,
      from: 1,
      total: 2,
      data: [
        {
          id: 1,
          meeting_id: 68,
          room_info: null,
          name: "Atteh Kayode",
          created_at: "2026-02-12T09:42:10.000Z",
          identifier: "68111",
          status: "start meeting",
        },
        {
          id: 2,
          meeting_id: 72,
          room_info: { id: 72, name: "Customer Onboarding" },
          name: "Atteh Kayode",
          created_at: "2026-01-28T17:29:37.000Z",
          identifier: "72222",
          status: "start meeting",
        },
      ],
    });

    expect(page.data[0].host).toBe("Atteh Kayode");
    expect(page.data[0].roomName).toBe("Atteh Kayode");
    expect(page.data[1].host).toBe("Customer Onboarding");
    expect(page.data.some((item) => item.host === "Unknown Room")).toBe(false);
  });

  test("getMeetings enriches records with /myrooms when room_info is null and renders resolved names in AttendanceList", async () => {
    api.get.mockImplementation((url) => {
      if (url === "/meeting-attendance") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              current_page: 1,
              last_page: 1,
              from: 1,
              total: 2,
              data: [
                {
                  id: 101,
                  meeting_id: 55,
                  room_info: null,
                  name: "Atteh Kayode",
                  created_at: "2026-02-12T09:42:10.000Z",
                  identifier: "55001",
                  status: "start meeting",
                },
                {
                  id: 102,
                  meeting_id: 88,
                  room_info: null,
                  name: "Sprint Retrospective",
                  created_at: "2026-01-28T17:29:37.000Z",
                  identifier: "88002",
                  status: "start meeting",
                },
              ],
            },
          },
        });
      }
      if (url === "/myrooms") {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              rooms: [{ id: 55, name: "Architecture Review Room" }],
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const result = await getMeetings(1);
    expect(result.data[0].host).toBe("Architecture Review Room");
    expect(result.data[1].host).toBe("Sprint Retrospective");

    await act(async () => {
      root.render(<AttendanceList />);
    });

    expect(host.textContent).toContain("Architecture Review Room");
    expect(host.textContent).toContain("Sprint Retrospective");
    expect(host.textContent).not.toContain("Unknown Room");
  });
});
