import React, { act } from "react";
import fs from "fs";
import path from "path";
import { createRoot } from "react-dom/client";
import Notifications, {
  createNotificationsStore,
  getUnreadCount,
  hasUnreadNotifications,
  markAllNotificationsAsRead,
  mockNotifications,
  NotificationsProvider,
  removeNotificationById,
  resetNotificationsStore,
  useNotifications,
} from "./Notifications";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === "string" ? fallback : key),
  }),
}));

global.IS_REACT_ACT_ENVIRONMENT = true;

function TopbarBellProbe() {
  const { unreadCount, hasUnread } = useNotifications();
  return (
    <a href="/notifications" aria-label="Notifications">
      {hasUnread && (
        <span
          data-testid="topbar-notification-badge"
          aria-label={`${unreadCount} unread notifications`}
        />
      )}
    </a>
  );
}

describe("Notifications unread count and badge state", () => {
  let host;
  let root;

  beforeEach(() => {
    resetNotificationsStore();
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

  test("pure helpers compute unread count and clear unread flags on bulk mark-all-read", () => {
    expect(getUnreadCount(mockNotifications)).toBe(2);
    expect(hasUnreadNotifications(mockNotifications)).toBe(true);

    const updated = markAllNotificationsAsRead(mockNotifications);
    expect(getUnreadCount(updated)).toBe(0);
    expect(hasUnreadNotifications(updated)).toBe(false);
    expect(updated.every((item) => item.isUnread === false)).toBe(true);

    const afterDismissFirst = removeNotificationById(mockNotifications, 1);
    expect(getUnreadCount(afterDismissFirst)).toBe(1);
    const afterDismissSecond = removeNotificationById(afterDismissFirst, 2);
    expect(getUnreadCount(afterDismissSecond)).toBe(0);
    expect(hasUnreadNotifications(afterDismissSecond)).toBe(false);
  });

  test("createNotificationsStore updates unreadCount and hasUnread after markAllAsRead", () => {
    const store = createNotificationsStore(mockNotifications);
    expect(store.getState().unreadCount).toBe(2);
    expect(store.getState().hasUnread).toBe(true);

    store.markAllAsRead();

    expect(store.getState().unreadCount).toBe(0);
    expect(store.getState().hasUnread).toBe(false);
    expect(store.getState().notifications.every((n) => !n.isUnread)).toBe(true);
  });

  test("clicking Mark all as read clears unread count, page indicators, and topbar notification badge", () => {
    act(() => {
      root.render(
        <NotificationsProvider>
          <TopbarBellProbe />
          <Notifications />
        </NotificationsProvider>
      );
    });

    expect(host.querySelector('[data-testid="topbar-notification-badge"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="notifications-unread-badge"]')?.textContent).toBe("2");
    expect(host.querySelector('[data-testid="notifications-page-unread-dot"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="notification-unread-indicator-1"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="notification-unread-indicator-2"]')).not.toBeNull();

    const markAllButton = Array.from(host.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Mark all as read")
    );
    expect(markAllButton).toBeDefined();

    act(() => {
      markAllButton.click();
    });

    expect(host.querySelector('[data-testid="topbar-notification-badge"]')).toBeNull();
    expect(host.querySelector('[data-testid="notifications-unread-badge"]')).toBeNull();
    expect(host.querySelector('[data-testid="notifications-page-unread-dot"]')).toBeNull();
    expect(host.querySelector('[data-testid="notification-unread-indicator-1"]')).toBeNull();
    expect(host.querySelector('[data-testid="notification-unread-indicator-2"]')).toBeNull();

    const markAllButtonAfter = Array.from(host.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Mark all as read")
    );
    expect(markAllButtonAfter).toBeUndefined();
  });

  test("dismissing all unread notifications updates unread count and removes badge", () => {
    act(() => {
      root.render(
        <NotificationsProvider>
          <TopbarBellProbe />
          <Notifications />
        </NotificationsProvider>
      );
    });

    const dismissButtons = host.querySelectorAll('button[title="Dismiss"]');
    expect(dismissButtons.length).toBe(5);

    // Dismiss first unread notification (id: 1)
    act(() => {
      dismissButtons[0].click();
    });
    expect(host.querySelector('[data-testid="notifications-unread-badge"]')?.textContent).toBe("1");
    expect(host.querySelector('[data-testid="topbar-notification-badge"]')).not.toBeNull();

    // Dismiss second unread notification (id: 2)
    const updatedDismissButtons = host.querySelectorAll('button[title="Dismiss"]');
    act(() => {
      updatedDismissButtons[0].click();
    });

    expect(host.querySelector('[data-testid="notifications-unread-badge"]')).toBeNull();
    expect(host.querySelector('[data-testid="topbar-notification-badge"]')).toBeNull();
    expect(host.querySelector('[data-testid="notifications-page-unread-dot"]')).toBeNull();
  });

  test("unread badge remains hidden when Notifications remounts after bulk-read", () => {
    act(() => {
      root.render(
        <NotificationsProvider>
          <TopbarBellProbe />
          <Notifications />
        </NotificationsProvider>
      );
    });

    const markAllButton = Array.from(host.querySelectorAll("button")).find((btn) =>
      btn.textContent.includes("Mark all as read")
    );
    act(() => {
      markAllButton.click();
    });

    // Simulate navigating away from /notifications and back
    act(() => {
      root.render(
        <NotificationsProvider>
          <TopbarBellProbe />
        </NotificationsProvider>
      );
    });
    expect(host.querySelector('[data-testid="topbar-notification-badge"]')).toBeNull();

    act(() => {
      root.render(
        <NotificationsProvider>
          <TopbarBellProbe />
          <Notifications />
        </NotificationsProvider>
      );
    });
    expect(host.querySelector('[data-testid="topbar-notification-badge"]')).toBeNull();
    expect(host.querySelector('[data-testid="notifications-unread-badge"]')).toBeNull();
  });

  test("side menu in App.js keeps the add-ons menu item commented out", () => {
    const appSource = fs.readFileSync(
      path.resolve(__dirname, "../App.js"),
      "utf8"
    );

    expect(appSource).toMatch(
      /\/\/\s*\{\s*titleKey:\s*"app\.sidebar\.addons",\s*url:\s*"\/addons",\s*icon:\s*AddonIcon\s*\}/
    );
  });
});
