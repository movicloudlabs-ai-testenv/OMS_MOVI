import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { authAPI } from '../utils/api';

const AuthContext = createContext(null);

const getActiveToken = () => {
  const sessionToken = sessionStorage.getItem('owms_token');
  if (sessionToken) return sessionToken;
  if (localStorage.getItem('owms_remember_me') === 'true') {
    return localStorage.getItem('owms_token');
  }
  return null;
};

const getActiveUser = () => {
  const sessionUser = sessionStorage.getItem('owms_user');
  if (sessionUser) {
    try { return JSON.parse(sessionUser); } catch { return null; }
  }
  if (localStorage.getItem('owms_remember_me') === 'true') {
    const localUser = localStorage.getItem('owms_user');
    if (localUser) {
      try { return JSON.parse(localUser); } catch { return null; }
    }
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(getActiveToken);
  const [loading, setLoading] = useState(true);

  // Permission check helper — used across the app
  // permName format matches backend: resource.toLowerCase().replace(spaces, '_') + '.' + action
  const hasPermission = useCallback((resource, action) => {
    if (!user?.role?.permissions) return false;
    if (user.role.slug === 'super-admin') return true;
    const permName = `${resource.toLowerCase().replace(/\s+/g, '_')}.${action}`;
    return user.role.permissions.some(
      (p) => p.name === permName && p.status === 'Active'
    );
  }, [user]);

  const login = useCallback(async (identifier, password, rememberMe = false) => {
    const response = await authAPI.login({ identifier, password });
    const { token: newToken, refreshToken, user: userData } = response.data.data;

    if (rememberMe) {
      localStorage.setItem('owms_token', newToken);
      if (refreshToken) localStorage.setItem('owms_refresh_token', refreshToken);
      localStorage.setItem('owms_user', JSON.stringify(userData));
      localStorage.setItem('owms_remember_me', 'true');
      sessionStorage.setItem('owms_token', newToken);
      sessionStorage.setItem('owms_user', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('owms_token', newToken);
      if (refreshToken) sessionStorage.setItem('owms_refresh_token', refreshToken);
      sessionStorage.setItem('owms_user', JSON.stringify(userData));

      localStorage.removeItem('owms_token');
      localStorage.removeItem('owms_refresh_token');
      localStorage.removeItem('owms_user');
      localStorage.removeItem('owms_remember_me');
      localStorage.removeItem('owms_mock_user');
    }

    setToken(newToken);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('owms_token');
    sessionStorage.removeItem('owms_refresh_token');
    sessionStorage.removeItem('owms_user');

    localStorage.removeItem('owms_token');
    localStorage.removeItem('owms_refresh_token');
    localStorage.removeItem('owms_user');
    localStorage.removeItem('owms_remember_me');
    // Legacy keys cleanup
    localStorage.removeItem('owms_mock_user');

    setToken(null);
    setUser(null);

    try {
      const channel = new BroadcastChannel('owms_auth_sync');
      channel.postMessage({ type: 'LOGOUT' });
      channel.close();
    } catch {
      // BroadcastChannel ignore
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    let isCancelled = false;

    const restore = async () => {
      // If remember_me was not explicitly enabled, purge unremembered localStorage
      if (localStorage.getItem('owms_remember_me') !== 'true') {
        localStorage.removeItem('owms_token');
        localStorage.removeItem('owms_refresh_token');
        localStorage.removeItem('owms_user');
        localStorage.removeItem('owms_mock_user');
      }

      let activeToken = getActiveToken();
      let activeUser = getActiveUser();

      // If this tab has no session and remember_me is not active, try asking peer tabs via BroadcastChannel
      if (!activeToken && !activeUser && typeof BroadcastChannel !== 'undefined') {
        try {
          const syncPromise = new Promise((resolve) => {
            const channel = new BroadcastChannel('owms_auth_sync');
            const timer = setTimeout(() => {
              try { channel.close(); } catch { /* ignore */ }
              resolve(null);
            }, 60);

            channel.onmessage = (e) => {
              if (e.data?.type === 'SESSION_RESPONSE' && e.data.token && e.data.user) {
                clearTimeout(timer);
                try {
                  sessionStorage.setItem('owms_token', e.data.token);
                  sessionStorage.setItem('owms_user', e.data.user);
                  channel.close();
                } catch { /* ignore */ }
                try {
                  resolve({ token: e.data.token, user: JSON.parse(e.data.user) });
                } catch {
                  resolve(null);
                }
              }
            };
            channel.postMessage({ type: 'REQUEST_SESSION' });
          });

          const synced = await syncPromise;
          if (synced && !isCancelled) {
            activeToken = synced.token;
            activeUser = synced.user;
          }
        } catch {
          // ignore error
        }
      }

      if (isCancelled) return;

      if (activeToken && activeUser) {
        setToken(activeToken);
        setUser(activeUser);
      } else {
        logout();
      }
      setLoading(false);
    };
    restore();

    // Listen for peer tab requests
    let authChannel;
    try {
      authChannel = new BroadcastChannel('owms_auth_sync');
      authChannel.onmessage = (e) => {
        const msg = e.data;
        if (!msg) return;
        if (msg.type === 'REQUEST_SESSION') {
          const curToken = sessionStorage.getItem('owms_token') || (localStorage.getItem('owms_remember_me') === 'true' ? localStorage.getItem('owms_token') : null);
          const curUser = sessionStorage.getItem('owms_user') || (localStorage.getItem('owms_remember_me') === 'true' ? localStorage.getItem('owms_user') : null);
          if (curToken && curUser) {
            authChannel.postMessage({
              type: 'SESSION_RESPONSE',
              token: curToken,
              user: curUser,
            });
          }
        } else if (msg.type === 'LOGOUT') {
          sessionStorage.removeItem('owms_token');
          sessionStorage.removeItem('owms_refresh_token');
          sessionStorage.removeItem('owms_user');
          localStorage.removeItem('owms_token');
          localStorage.removeItem('owms_refresh_token');
          localStorage.removeItem('owms_user');
          localStorage.removeItem('owms_remember_me');
          setToken(null);
          setUser(null);
        }
      };
    } catch {
      // ignore
    }

    // Listen for 401 events dispatched by the axios interceptor
    const handle401 = () => logout();
    window.addEventListener('owms:unauthorized', handle401);
    return () => {
      isCancelled = true;
      try { authChannel?.close(); } catch { /* ignore */ }
      window.removeEventListener('owms:unauthorized', handle401);
    };
  }, [logout]);

  // Re-fetch the current user (role + permissions) from the server.
  // Used on-demand (e.g. right after an Access Matrix save) and by the
  // background refresh, so permission changes reflect without a re-login.
  const refreshUser = useCallback(async () => {
    const activeToken = getActiveToken();
    if (!activeToken) return null;
    try {
      const res = await api.get('/auth/me');
      const freshUser = res.data.data;
      setUser(freshUser);
      if (sessionStorage.getItem('owms_token')) {
        sessionStorage.setItem('owms_user', JSON.stringify(freshUser));
      }
      if (localStorage.getItem('owms_remember_me') === 'true') {
        localStorage.setItem('owms_user', JSON.stringify(freshUser));
      }
      return freshUser;
    } catch {
      // Token invalid — the 401 listener handles logout
      return null;
    }
  }, []);

  const handleSetUser = useCallback((updater) => {
    setUser((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next) {
        if (sessionStorage.getItem('owms_token')) {
          sessionStorage.setItem('owms_user', JSON.stringify(next));
        }
        if (localStorage.getItem('owms_remember_me') === 'true') {
          localStorage.setItem('owms_user', JSON.stringify(next));
        }
      }
      return next;
    });
  }, []);

  // Silently refresh permissions every 5 min + on window focus
  // so Access Matrix changes reflect without requiring logout
  useEffect(() => {
    if (!user?._id) return;
    const interval = setInterval(refreshUser, 5 * 60 * 1000);
    window.addEventListener('focus', refreshUser);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshUser);
    };
  }, [user?._id, refreshUser]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, hasPermission, refreshUser, setUser: handleSetUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
