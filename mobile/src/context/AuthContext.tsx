import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthApi, UserProfile } from '../api/auth.api';
import { SecureStorage, STORAGE_KEYS } from '../services/storage';
import { BiometricService } from '../services/biometrics';

export type UserRoleSlug = 'super-admin' | 'admin' | 'hr-manager' | 'pmo-lead' | 'employee' | 'intern';

interface AuthContextType {
  user: UserProfile | null;
  roleSlug: UserRoleSlug | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  login: (identifier: string, pass: string) => Promise<void>;
  biometricLogin: () => Promise<boolean>;
  logout: () => Promise<void>;
  toggleBiometric: (enabled: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState<boolean>(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(false);

  // Extract role slug safely
  const getRoleSlug = (usr: UserProfile | null): UserRoleSlug | null => {
    if (!usr || !usr.role) return null;
    if (typeof usr.role === 'string') return usr.role.toLowerCase() as UserRoleSlug;
    if (typeof usr.role === 'object' && usr.role.slug) return usr.role.slug.toLowerCase() as UserRoleSlug;
    return null;
  };

  const roleSlug = getRoleSlug(user);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check biometric capability
        const bioStatus = await BiometricService.checkBiometricSupport();
        setIsBiometricAvailable(bioStatus.hasHardware && bioStatus.isEnrolled);

        const bioPref = await SecureStorage.get(STORAGE_KEYS.BIOMETRIC_ENABLED);
        setIsBiometricEnabled(bioPref === 'true');

        const token = await SecureStorage.get(STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
          const res = await AuthApi.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          }
        }
      } catch (err) {
        console.log('Session restore error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (identifier: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await AuthApi.login(identifier, pass);
      const token = data.accessToken || data.token;
      if (token) {
        await SecureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
      }
      if (data.refreshToken) {
        await SecureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      }
      if (data.user) {
        setUser(data.user);
        await SecureStorage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(data.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const biometricLogin = async (): Promise<boolean> => {
    const success = await BiometricService.authenticate('Unlock Movi OWMS with Biometrics');
    if (success) {
      const savedUser = await SecureStorage.get(STORAGE_KEYS.USER_DATA);
      const token = await SecureStorage.get(STORAGE_KEYS.ACCESS_TOKEN);
      if (savedUser && token) {
        setUser(JSON.parse(savedUser));
        return true;
      }
    }
    return false;
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AuthApi.logout();
    } catch (e) {
      // Ignore
    } finally {
      await SecureStorage.delete(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStorage.delete(STORAGE_KEYS.REFRESH_TOKEN);
      setUser(null);
      setIsLoading(false);
    }
  };

  const toggleBiometric = async (enabled: boolean) => {
    setIsBiometricEnabled(enabled);
    await SecureStorage.set(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roleSlug,
        isAuthenticated: !!user,
        isLoading,
        isBiometricAvailable,
        isBiometricEnabled,
        login,
        biometricLogin,
        logout,
        toggleBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
