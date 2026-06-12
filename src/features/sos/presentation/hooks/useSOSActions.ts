import { useMemo } from 'react';
import { Container, DI_TOKENS } from '@core/di/Container';
import type { ISOSRepository }      from '../../domain/interfaces/ISOSRepository';
import type { IAlertDispatcher }    from '../../domain/interfaces/IAlertDispatcher';
import type { IGuardianRepository } from '@features/guardian/domain/interfaces/IGuardianRepository';
import { TriggerSOSUseCase }        from '../../application/TriggerSOSUseCase';
import { CancelSOSUseCase }         from '../../application/CancelSOSUseCase';
import { EscalateAlertUseCase }     from '../../application/EscalateAlertUseCase';

/**
 * Resolves SOS use cases from the DI container.
 * Memoised so the same instance is used across re-renders.
 */
export function useSOSActions(): {
  triggerUseCase: TriggerSOSUseCase;
  cancelUseCase: CancelSOSUseCase;
  escalateUseCase: EscalateAlertUseCase;
} {
  return useMemo(() => {
    const sosRepo      = Container.resolve<ISOSRepository>(DI_TOKENS.ISOSRepository);
    const guardianRepo = Container.resolve<IGuardianRepository>(DI_TOKENS.IGuardianRepository);
    const dispatcher   = Container.resolve<IAlertDispatcher>(DI_TOKENS.IAlertDispatcher);

    return {
      triggerUseCase:  new TriggerSOSUseCase(sosRepo, guardianRepo, dispatcher),
      cancelUseCase:   new CancelSOSUseCase(sosRepo),
      escalateUseCase: new EscalateAlertUseCase(sosRepo, guardianRepo, dispatcher),
    };
  }, []);
}
