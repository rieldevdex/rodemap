import { RegistrationControl } from '../../components/organisms/RegistrationControl';
import { useRegistration } from '../../state/useRegistration';

/** Connects RegistrationControl to the store for one event. */
export function EventRegistration({ eventId, size = 'md' }: { eventId: string; size?: 'sm' | 'md' }) {
  const { info, register, unregister } = useRegistration(eventId);
  if (!info) return null;
  return (
    <RegistrationControl
      event={info.event}
      clubName={info.club?.shortName ?? ''}
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
