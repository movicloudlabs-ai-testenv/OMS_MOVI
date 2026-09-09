import * as Network from 'expo-network';
import { useState, useEffect } from 'react';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: Network.NetworkStateType;
}

export const NetworkService = {
  async getNetworkState(): Promise<NetworkState> {
    try {
      const state = await Network.getNetworkStateAsync();
      return {
        isConnected: Boolean(state.isConnected),
        isInternetReachable: Boolean(state.isInternetReachable),
        type: state.type || Network.NetworkStateType.UNKNOWN,
      };
    } catch (e) {
      return {
        isConnected: true,
        isInternetReachable: true,
        type: Network.NetworkStateType.UNKNOWN,
      };
    }
  },
};

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      const state = await NetworkService.getNetworkState();
      if (isMounted) {
        setIsOnline(state.isConnected && state.isInternetReachable !== false);
      }
    };

    check();
    const interval = setInterval(check, 8000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isOnline };
};
