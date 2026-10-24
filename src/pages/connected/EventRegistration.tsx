import { Button } from '../../components/atoms/Button';
import { RegistrationControl } from '../../components/organisms/RegistrationControl';
import { publisherLine } from '../../domain/events';
import { useSetupHref } from '../../router/Router';
import { useSelector } from '../../state/hooks';
import { useRegistration } from '../../state/useRegistration';

/**
 * Connects RegistrationControl to the store for one event. A visitor without a profile sees
 * "Thiết lập hồ sơ để đăng ký" instead of "Đăng ký" (DESIGN.md §7.2); it returns to this page.
 */
export function EventRegistration({ eventId, size = 'md' }: { eventId: string; size?: 'sm' | 'md' }) {
  const { info, register, unregister } = useRegistration(eventId);
  const hasProfile = useSelector((s) => s.profile !== null);
  const setupHref = useSetupHref();
  if (!info) return null;
  if (!hasProfile && info.state === 'open') {
    return (
      <Button to={setupHref} variant="secondary" size={size}>
        Thiết lập hồ sơ để đăng ký
      </Button>
    );
  }
  return (
    <RegistrationControl
      event={info.event}
      clubName={publisherLine(info.event, info.club?.shortName ?? '')}
      state={info.state}
      seatsLeft={info.seatsLeft}
      conflicts={info.conflicts}
      overBudget={info.overBudget}
      eligible={info.eligible}
      canRegister={info.canRegister}
      canUnregister={info.canUnregister}
      onRegister={register}
      onUnregister={unregister}
      size={size}
    />
  );
}
