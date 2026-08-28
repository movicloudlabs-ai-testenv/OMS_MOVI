import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { notificationAPI } from '../api';

const NotificationContext = createContext(null);

// Admin does not receive in-app notifications (per product spec).
const NOTIF_DISABLED_ROLES = new Set(['admin', 'super-admin']);
const POLL_MS = 30000;

// Section key = first two path segments, e.g. /hr/interns/123 -> /hr/interns.
// Notification links and sidebar nav targets both reduce to this, so they match.
export const sectionKey = (path) => {
  if (!path) return '';
  const parts = path.split('/').filter(Boolean).slice(0, 2);
  return parts.length ? `/${parts.join('/')}` : '';
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();

  const roleSlug = user?.role?.slug || user?.role || '';
  const enabled = !!user && !NOTIF_DISABLED_ROLES.has(roleSlug);
  const userId = user?._id || user?.id || 'anon';
  const lsKey = `owms_nav_seen_${userId}`;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Per-section "last visited" timestamps (localStorage, per user). A dot shows
  // when a section has a notification newer than its last-seen time.
  const [seen, setSeen] = useState({});
  const seenRef = useRef(seen);
  useEffect(() => { seenRef.current = seen; }, [seen]);

  // Load this user's seen-map whenever the user changes.
  useEffect(() => {
    try {
      setSeen(JSON.parse(localStorage.getItem(lsKey) || '{}'));
    } catch {
      setSeen({});
    }
  }, [lsKey]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await notificationAPI.getAll();
      const data = res.data?.data || {};
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Silent — a polling failure must never disrupt the UI.
    }
  }, [enabled]);

  // Initial fetch + 30s poll.
  useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, refresh]);

  // Mark a section as seen (clears its dot) — persists to localStorage.
  const markSectionSeen = useCallback((path) => {
    const key = sectionKey(path);
    if (!key) return;
    const next = { ...seenRef.current, [key]: Date.now() };
    seenRef.current = next;
    setSeen(next);
    try { localStorage.setItem(lsKey, JSON.stringify(next)); } catch { /* ignore quota */ }
  }, [lsKey]);

  // Visiting a page (and any refresh while on it) marks that section seen.
  useEffect(() => {
    if (!enabled) return;
    markSectionSeen(location.pathname);
  }, [enabled, location.pathname, notifications, markSectionSeen]);

  // Whether a sidebar nav target has unseen activity.
  const hasActivity = useCallback((navTo) => {
    if (!enabled) return false;
    const key = sectionKey(navTo);
    if (!key) return false;
    if (sectionKey(location.pathname) === key) return false; // you're already here
    const seenAt = seen[key] || 0;
    return notifications.some(
      (n) => n.link && sectionKey(n.link) === key && new Date(n.createdAt).getTime() > seenAt
    );
  }, [enabled, notifications, seen, location.pathname]);

  // Optimistic read helpers (used by the bell).
  const markRead = useCallback(async (notif) => {
    if (!notif?._id || notif.read) return;
    setNotifications((prev) => prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationAPI.markRead(notif._id);
    } catch {
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await notificationAPI.markAllRead();
    } catch {
      refresh();
    }
  }, [unreadCount, refresh]);

  const value = {
    enabled,
    notifications,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
    hasActivity,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Safe fallback so components outside the provider don't crash.
    return {
      enabled: false,
      notifications: [],
      unreadCount: 0,
      refresh: () => {},
      markRead: () => {},
      markAllRead: () => {},
      hasActivity: () => false,
    };
  }
  return ctx;
}
