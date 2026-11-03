import React from "react";
import { Bell, CheckCircle2, AlertTriangle, Calendar as CalendarIcon, Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";

// Mock data for notifications since no backend connection is required
export const mockNotifications = [
  {
    id: 1,
    title: "New Meeting Scheduled",
    description: "You have been invited to 'Quarterly Planning' by John Doe.",
    time: "10 minutes ago",
    type: "info",
    icon: CalendarIcon,
    isUnread: true,
  },
  {
    id: 2,
    title: "System Update Complete",
    description: "Konn3ct dashboard has been updated to version 2.4.0 successfully.",
    time: "2 hours ago",
    type: "success",
    icon: CheckCircle2,
    isUnread: true,
  },
  {
    id: 3,
    title: "Upcoming Meeting Reminder",
    description: "Your meeting 'Product Sync' starts in 15 minutes.",
    time: "5 hours ago",
    type: "warning",
    icon: Clock,
    isUnread: false,
  },
  {
    id: 4,
    title: "Subscription Renewed",
    description: "Your premium subscription has been successfully renewed for another month.",
    time: "1 day ago",
    type: "success",
    icon: CheckCircle2,
    isUnread: false,
  },
  {
    id: 5,
    title: "Network Latency Warning",
    description: "We detected high latency during your last call. Check your internet connection.",
    time: "2 days ago",
    type: "warning",
    icon: AlertTriangle,
    isUnread: false,
  }
];

const cloneNotifications = (items = []) =>
  Array.isArray(items) ? items.map((item) => ({ ...item })) : [];

export const getUnreadCount = (notifications = []) =>
  Array.isArray(notifications)
    ? notifications.filter((notification) => Boolean(notification?.isUnread)).length
    : 0;

export const hasUnreadNotifications = (notifications = []) =>
  getUnreadCount(notifications) > 0;

export const markAllNotificationsAsRead = (notifications = []) =>
  Array.isArray(notifications)
    ? notifications.map((notification) => ({ ...notification, isUnread: false }))
    : [];

export const removeNotificationById = (notifications = [], id) =>
  Array.isArray(notifications)
    ? notifications.filter((notification) => notification.id !== id)
    : [];

export const createNotificationsStore = (initialNotifications = mockNotifications) => {
  let notifications = cloneNotifications(initialNotifications);
  const listeners = new Set();

  const buildSnapshot = () => {
    const unreadCount = getUnreadCount(notifications);
    return {
      notifications,
      unreadCount,
      hasUnread: unreadCount > 0,
    };
  };

  let snapshot = buildSnapshot();

  const emitChange = () => {
    snapshot = buildSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  };

  return {
    getState: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setNotifications: (updater) => {
      const next =
        typeof updater === "function" ? updater(notifications) : updater;
      notifications = cloneNotifications(next);
      emitChange();
    },
    markAllAsRead: () => {
      notifications = markAllNotificationsAsRead(notifications);
      emitChange();
    },
    markAsRead: (id) => {
      notifications = notifications.map((notification) =>
        notification.id === id ? { ...notification, isUnread: false } : notification
      );
      emitChange();
    },
    removeNotification: (id) => {
      notifications = removeNotificationById(notifications, id);
      emitChange();
    },
    resetNotifications: (nextNotifications = initialNotifications) => {
      notifications = cloneNotifications(nextNotifications);
      emitChange();
    },
  };
};

const defaultNotificationsStore = createNotificationsStore(mockNotifications);

export const resetNotificationsStore = (nextNotifications = mockNotifications) => {
  defaultNotificationsStore.resetNotifications(nextNotifications);
};

export const NotificationsContext = React.createContext(null);

export const NotificationsProvider = ({ children, initialNotifications }) => {
  const storeRef = React.useRef(null);

  if (!storeRef.current) {
    storeRef.current =
      initialNotifications !== undefined
        ? createNotificationsStore(initialNotifications)
        : defaultNotificationsStore;
  }

  return (
    <NotificationsContext.Provider value={storeRef.current}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const contextStore = React.useContext(NotificationsContext);
  const store = contextStore || defaultNotificationsStore;
  const [state, setState] = React.useState(() => store.getState());

  React.useEffect(() => {
    setState(store.getState());
    return store.subscribe(setState);
  }, [store]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    hasUnread: state.hasUnread,
    markAllAsRead: store.markAllAsRead,
    markAsRead: store.markAsRead,
    removeNotification: store.removeNotification,
    setNotifications: store.setNotifications,
    resetNotifications: store.resetNotifications,
  };
};

const Notifications = () => {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    hasUnread,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  const getIconColor = (type) => {
    switch (type) {
      case "success": return "text-green-500 bg-green-500/10";
      case "warning": return "text-orange-500 bg-orange-500/10";
      case "error": return "text-red-500 bg-red-500/10";
      default: return "text-brand-blue bg-brand-blue/10";
    }
  };

  return (
    <div className="w-full flex-1 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/10 text-brand-green">
              <Bell className="h-6 w-6" />
              {hasUnread && (
                <span
                  data-testid="notifications-page-unread-dot"
                  className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-brand-green ring-2 ring-surface"
                />
              )}
            </div>
            <span>{t("notifications.title", "Notifications")}</span>
            {unreadCount > 0 && (
              <span
                data-testid="notifications-unread-badge"
                className="inline-flex items-center justify-center rounded-full bg-brand-green/10 px-2.5 py-0.5 text-xs font-semibold text-brand-green"
              >
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            {t("notifications.subtitle", "Stay updated with your latest meeting alerts, system announcements, and account activities.")}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            onClick={markAllAsRead}
            className="rounded-xl font-medium border-border/60 hover:bg-black/[0.02]"
          >
            <CheckCircle2 className="w-4 h-4 mr-2 text-muted-foreground" />
            {t("notifications.markAllRead", "Mark all as read")}
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-surface border border-border/60 rounded-3xl">
            <div className="h-16 w-16 bg-black/[0.03] dark:bg-white/[0.03] rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No notifications yet</h3>
            <p className="text-sm text-muted-foreground mt-1">You're all caught up! Check back later for updates.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification.id}
              className={cn(
                "group relative flex gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-md",
                notification.isUnread 
                  ? "bg-surface border-brand-green/30 shadow-sm" 
                  : "bg-surface/50 border-border/60 hover:bg-surface"
              )}
            >
              {notification.isUnread && (
                <div
                  data-testid={`notification-unread-indicator-${notification.id}`}
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-brand-green rounded-r-full"
                />
              )}
              
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", getIconColor(notification.type))}>
                <notification.icon className="h-6 w-6" />
              </div>
              
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center justify-between gap-4">
                  <h4 className={cn("text-base font-semibold truncate", notification.isUnread ? "text-foreground" : "text-foreground/80")}>
                    {notification.title}
                  </h4>
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {notification.time}
                  </span>
                </div>
                <p className={cn("mt-1 text-sm leading-relaxed", notification.isUnread ? "text-muted-foreground" : "text-muted-foreground/80")}>
                  {notification.description}
                </p>
              </div>

              <button 
                onClick={() => removeNotification(notification.id)}
                className="opacity-0 group-hover:opacity-100 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/[0.04] text-muted-foreground transition-all absolute right-4 top-4"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
