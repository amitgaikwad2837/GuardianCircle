import { useState, useCallback } from 'react';
import { PermissionManager, type AppPermission } from '@core/permissions/PermissionManager';

interface PermissionState {
  granted: boolean;
  checked: boolean;
}

export function usePermission(permission: AppPermission): {
  state: PermissionState;
  request: () => Promise<boolean>;
  check: () => Promise<void>;
} {
  const [state, setState] = useState<PermissionState>({ granted: false, checked: false });

  const check = useCallback(async () => {
    const granted = await PermissionManager.check(permission);
    setState({ granted, checked: true });
  }, [permission]);

  const request = useCallback(async (): Promise<boolean> => {
    const granted = await PermissionManager.request(permission);
    setState({ granted, checked: true });
    return granted;
  }, [permission]);

  return { state, request, check };
}
