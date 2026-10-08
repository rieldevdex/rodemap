import { useCallback, useRef } from 'react';
import { MochiCardView, type CardEvent } from '../../components/organisms/MochiCards';
import { MochiDock } from '../../components/organisms/MochiDock';
import { MochiPanel } from '../../components/organisms/MochiPanel';
import { formatDayLabel, formatTimeRange, toMillis } from '../../domain/dates';
import { googleCalendarUrl } from '../../domain/gcal';
import { CLUBS } from '../../data/clubs';
import { useMochi } from '../../state/mochiContext';
import { useCatalog } from '../../state/useCatalog';
import { registrationInfo } from '../../state/useRegistration';
import { selectUpcomingMine } from '../../state/selectors';
import { DEFAULT_WEEKLY_HOUR_BUDGET } from '../../domain/budget';

const STATUS: Record<string, string> = {
  registered: 'Đã đăng ký',
  attended: 'Đã tham gia',
  absent: 'Không tham gia',
  open: 'Còn chỗ',
  full: 'Hết chỗ',
  closed: 'Hết hạn đăng ký',
  past: 'Đã diễn ra',
};

const SUGGESTIONS = ['Gợi ý sự kiện tuần tới', 'Lịch của tôi', 'Tóm tắt tuần này', 'Bản tin Hội đồng Học sinh', 'Hồ sơ năng lực'];

/** Mounts the dock and the panel, wiring Mochi's cards to the store. */
export function MochiConnected() {
  const mochi = useMochi();
  const { state, now, eventById, clubName } = useCatalog();
  const dockRef = useRef<HTMLButtonElement>(null);

  const lookup = useCallback(
    (eventId: string): CardEvent | undefined => {
      const e = eventById(eventId);
      if (!e) return undefined;
      const info = registrationInfo(e, {
        club: CLUBS.find((c) => c.id === e.clubId),
        plan: selectUpcomingMine(state, now),
        regs: state.registrations,
        grade: state.profile?.grade ?? null,
        budget: state.profile?.weeklyHourBudget ?? DEFAULT_WEEKLY_HOUR_BUDGET,
        now,
      });
      const start = toMillis(e.start);
      return {
        id: e.id,
        title: e.title,
        category: e.category,
        club: clubName(e.clubId),
        when: `${formatDayLabel(start)} · ${formatTimeRange(start, toMillis(e.end))}`,
        location: e.location,
        status: STATUS[info.state] ?? '',
        href: `/su-kien/${e.slug}`,
        conflicts: info.conflicts.map((c) => c.title),
        overBudget: info.overBudget,
        googleCalendarUrl: googleCalendarUrl(e, { clubs: CLUBS, baseUrl: window.location.origin }),
      };
    },
    [eventById, clubName, state, now],
  );

  const close = () => {
    mochi.setOpen(false);
    window.requestAnimationFrame(() => dockRef.current?.focus());
  };

  return (
    <>
      <MochiDock
        ref={dockRef}
        open={mochi.open}
        figure={mochi.figure}
        offline={mochi.mode === 'offline'}
        onToggle={() => {
          if (mochi.open) close();
          else mochi.setOpen(true);
        }}
      />
      <MochiPanel
        open={mochi.open}
        items={mochi.items}
        busy={mochi.busy}
        mode={mochi.mode}
        figure={mochi.figure}
        suggestions={mochi.items.length === 0 || !mochi.busy ? SUGGESTIONS : []}
        onSend={mochi.send}
        onClose={close}
        onNewConversation={mochi.newConversation}
        renderCard={(item) => (
          <MochiCardView
            card={item.card}
            status={item.status}
            lookup={lookup}
            onConfirmRegistration={(eventId, action) => {
              mochi.confirmRegistration(item.id, eventId, action);
            }}
            onConfirmPlan={(ids) => {
              mochi.confirmPlan(item.id, ids);
            }}
            onSaveDraft={(eventId, reflection, role) => {
              mochi.saveDraft(item.id, eventId, reflection, role);
            }}
            onDismiss={() => {
              mochi.dismissCard(item.id);
            }}
            onExport={mochi.exportIcs}
          />
        )}
      />
    </>
  );
}
