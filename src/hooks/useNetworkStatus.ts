import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    let mounted = true;

    async function checkStatus() {
      const state = await Network.getNetworkStateAsync();
      if (mounted) {
        setStatus({
          isConnected: state.isConnected ?? false,
          isInternetReachable: state.isInternetReachable ?? false,
        });
      }
    }

    checkStatus();

    // expo-network doesn't provide a subscription API,
    // so poll on a reasonable interval for connectivity changes.
    const interval = setInterval(checkStatus, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return status;
}
