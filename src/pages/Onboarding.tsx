import { useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Button } from '../components/atoms/Button';
import { Icon } from '../components/atoms/Icon';
import { LineBadge } from '../components/atoms/LineBadge';
import { MonoTime } from '../components/atoms/MonoTime';
import { StatusTag } from '../components/atoms/StatusTag';
import { Mochi } from '../components/organisms/Mochi';
import { StepLine } from '../components/organisms/StepLine';
import { PageHead } from '../components/molecules/PageHead';
import { describeReasons } from '../content/reasons';
import { CATEGORIES } from '../data/categories';
import { GOALS } from '../data/goals';
import { CATEGORY_LABELS } from '../domain/category-labels';
import { formatDayLabel, formatTimeRange, toIsoDateTime, toMillis } from '../domain/dates';
import {
  BUDGET_LIMITS,
  clampBudget,
  draftToProfile,
  emptyDraft,
  moveInterest,
  ONBOARDING_STEPS,
  stepErrors,
  toggleGoal,
  toggleInterest,
  TOP_INTEREST_COUNT,
  type DraftErrors,
  type DraftField,
  type OnboardingStep,
  type ProfileDraft,
} from '../domain/profile';
import { GRADES, type CategoryCode } from '../domain/types';
import { useNavigate } from '../router';
import { rememberRouteBefore } from '../state/routeMemory';
import { selectFirstRoute, selectMyEvents, selectRecommendations } from '../state/selectors';
import { useCatalog } from '../state/useCatalog';
import './Onboarding.css';

const STEP_TITLES: Record<OnboardingStep, { short: string; title: string; hint: string }> = {
  class: {
    short: 'Khối và lớp',
    title: 'Khối và lớp',
    hint: 'Khối lớp giúp Rodemap chỉ đề xuất các sự kiện dành cho bạn.',
  },
  interests: {
    short: 'Lĩnh vực quan tâm',
    title: 'Lĩnh vực quan tâm',
    hint: 'Chọn các lĩnh vực bạn quan tâm, sau đó sắp xếp ba lĩnh vực ưu tiên nhất lên đầu danh sách.',
  },
  goals: {
    short: 'Mục tiêu',
    title: 'Mục tiêu trong năm học',
    hint: 'Chọn một hoặc nhiều mục tiêu. Mochi ưu tiên các sự kiện góp phần thực hiện những mục tiêu này.',
  },
  time: {
    short: 'Thời gian',
    title: 'Thời gian có thể tham gia',
    hint: 'Mochi chỉ đề xuất sự kiện trong khoảng thời gian bạn có thể tham gia và không vượt quỹ giờ mỗi tuần.',
  },
};

const STEPS = ONBOARDING_STEPS.map((id) => ({
  id,
  label: STEP_TITLES[id].short,
}));

/** The control that receives focus when a field has an error. */
const FIELD_FOCUS: Record<DraftField, string> = {
  grade: 'ob-grade-10',
  className: 'ob-class',
  interests: 'ob-int-HT',
  goals: 'ob-goal-leadership',
  availability: 'ob-weekday',
};

function ErrorText({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p id={id} className="onboarding__error">
      <Icon name="alert" size="sm" />
      <span>{message}</span>
    </p>
  );
}

export function OnboardingPage() {
  const { state, dispatch, now } = useCatalog();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<OnboardingStep>>(new Set());
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [announcement, setAnnouncement] = useState('');
  /** Id of the control to focus after the next render (errors, reordering). */
  const pendingFocus = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  const step = ONBOARDING_STEPS[stepIndex] ?? 'class';
  const meta = STEP_TITLES[step];
  const errors: DraftErrors = attempted.has(step) ? stepErrors(draft, step) : {};

  const profile = useMemo(() => draftToProfile(draft, now), [draft, now]);
  const proposal = useMemo(() => (profile ? selectFirstRoute({ ...state, profile }, now) : null), [profile, state, now]);
  const reasonsById = useMemo(() => {
    if (!profile || !proposal) return new Map<string, string[]>();
    const recs = selectRecommendations({ ...state, profile }, now, {
      limit: 40,
    });
    return new Map(recs.map((r) => [r.event.id, describeReasons(r).slice(0, 2)]));
  }, [profile, proposal, state, now]);
  const chosen = proposal ? proposal.accepted.filter((e) => !excluded.has(e.id)) : [];

  /* Move focus to the step heading after a step change (not on first render: the router focuses the h1). */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    if (pendingFocus.current === null) return;
    document.getElementById(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  });

  const update = (patch: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const goTo = (index: number) => {
    setStepIndex(index);
    window.scrollTo({ top: 0 });
  };

  const next = (ev: SyntheticEvent) => {
    ev.preventDefault();
    const found = stepErrors(draft, step);
    const first = (Object.keys(found) as DraftField[])[0];
    if (first !== undefined) {
      setAttempted((a) => new Set([...a, step]));
      pendingFocus.current = FIELD_FOCUS[first];
      return;
    }
    if (stepIndex < ONBOARDING_STEPS.length - 1) goTo(stepIndex + 1);
  };

  const move = (code: CategoryCode, delta: -1 | 1) => {
    const list = moveInterest(draft.interests, code, delta);
    update({ interests: list });
    const index = list.indexOf(code);
    setAnnouncement(`${CATEGORY_LABELS[code]} chuyển đến vị trí ${String(index + 1)}.`);
    if (index === 0) pendingFocus.current = `ob-rank-${code}-down`;
    else if (index === list.length - 1) pendingFocus.current = `ob-rank-${code}-up`;
  };

  const finish = (withRoute: boolean) => {
    const timeErrors = stepErrors(draft, 'time');
    if (!profile || Object.keys(timeErrors).length > 0) {
      setAttempted((a) => new Set([...a, 'time']));
      pendingFocus.current = FIELD_FOCUS.availability;
      return;
    }
    dispatch({ type: 'profile/complete', profile });
    if (withRoute && chosen.length > 0) {
      rememberRouteBefore(selectMyEvents(state).map((e) => e.id));
      const at = toIsoDateTime(now);
      for (const e of chosen) dispatch({ type: 'registration/register', eventId: e.id, at });
      navigate('/lo-trinh?pham-vi=cua-toi');
    } else {
      navigate('/tong-quan');
    }
  };

  const describedBy = (...ids: (string | false)[]) => ids.filter(Boolean).join(' ') || undefined;

  return (
    <div className="onboarding">
      <PageHead
        eyebrow={`Thiết lập hồ sơ · Bước ${String(stepIndex + 1)}/${String(ONBOARDING_STEPS.length)}`}
        title="Thiết lập hồ sơ"
        lead="Bốn bước thiết lập giúp Rodemap đề xuất lộ trình phù hợp với khối lớp, lĩnh vực quan tâm, mục tiêu và thời gian của bạn."
      >
        {state.profile ? (
          <p className="onboarding__existing">
            <Icon name="info" size="sm" />
            <span>
              Bạn đã thiết lập hồ sơ cho lớp {state.profile.className}. Hoàn tất bốn bước dưới đây sẽ cập nhật hồ sơ hiện tại; các sự kiện đã đăng ký được giữ
              nguyên.
            </span>
          </p>
        ) : null}
      </PageHead>

      <div className="band band--surface">
        <div className="container onboarding__inner">
          <StepLine
            steps={STEPS}
            current={stepIndex}
            label="Các bước thiết lập hồ sơ"
            onSelect={(i) => {
              goTo(i);
            }}
          />

          <form className="onboarding__panel" onSubmit={next} noValidate aria-labelledby="ob-step-title">
            <div className="onboarding__step-head">
              <h2 id="ob-step-title" className="onboarding__h2" tabIndex={-1} ref={headingRef}>
                {meta.title}
              </h2>
              <p className="onboarding__hint">{meta.hint}</p>
            </div>

            {step === 'class' ? (
              <>
                <fieldset className="onboarding__fieldset" aria-describedby={describedBy(errors.grade !== undefined && 'ob-grade-error')}>
                  <legend className="onboarding__legend">Khối</legend>
                  <ErrorText id="ob-grade-error" message={errors.grade} />
                  <div className="onboarding__grades">
                    {GRADES.map((g) => (
                      <label key={g} className="onboarding__grade">
                        <input
                          id={`ob-grade-${String(g)}`}
                          type="radio"
                          name="grade"
                          checked={draft.grade === g}
                          onChange={() => {
                            update({ grade: g });
                          }}
                        />
                        <span>Khối {g}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="onboarding__field">
                  <label htmlFor="ob-class" className="onboarding__legend">
                    Lớp
                  </label>
                  <p id="ob-class-hint" className="onboarding__small">
                    Ví dụ: 10A1, 11A2, 12CT.
                  </p>
                  <input
                    id="ob-class"
                    className="onboarding__input"
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={8}
                    value={draft.className}
                    aria-invalid={errors.className !== undefined || undefined}
                    aria-describedby={describedBy('ob-class-hint', errors.className !== undefined && 'ob-class-error')}
                    onChange={(e) => {
                      update({ className: e.target.value });
                    }}
                  />
                  <ErrorText id="ob-class-error" message={errors.className} />
                </div>
                <p className="onboarding__privacy">
                  <Icon name="info" size="sm" />
                  <span>
                    Rodemap chỉ ghi nhận khối, lớp, lĩnh vực quan tâm, mục tiêu và thời gian có thể tham gia. Vui lòng không nhập họ tên, số điện thoại, địa chỉ
                    hay thông tin cá nhân khác.
                  </span>
                </p>
              </>
            ) : null}

            {step === 'interests' ? (
              <>
                <fieldset className="onboarding__fieldset" aria-describedby={describedBy(errors.interests !== undefined && 'ob-int-error')}>
                  <legend className="onboarding__legend">Các lĩnh vực bạn quan tâm</legend>
                  <ErrorText id="ob-int-error" message={errors.interests} />
                  <div className="onboarding__options">
                    {CATEGORIES.map((c) => (
                      <label key={c.code} className="onboarding__option">
                        <input
                          id={`ob-int-${c.code}`}
                          type="checkbox"
                          checked={draft.interests.includes(c.code)}
                          onChange={() => {
                            update({
                              interests: toggleInterest(draft.interests, c.code),
                            });
                          }}
                        />
                        <span className="onboarding__option-body">
                          <span className="onboarding__option-title">
                            <LineBadge code={c.code} size="sm" />
                            <span>{c.name}</span>
                          </span>
                          <span className="onboarding__option-text">{c.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {draft.interests.length > 0 ? (
                  <section className="onboarding__rank" aria-labelledby="ob-rank-title">
                    <h3 id="ob-rank-title" className="onboarding__legend">
                      Thứ tự ưu tiên
                    </h3>
                    <p className="onboarding__small">
                      {draft.interests.length > TOP_INTEREST_COUNT
                        ? `Ba lĩnh vực đầu danh sách là lĩnh vực ưu tiên. Sử dụng các nút mũi tên để sắp xếp lại.`
                        : 'Các lĩnh vực đã chọn đều là lĩnh vực ưu tiên. Sử dụng các nút mũi tên để sắp xếp lại.'}
                    </p>
                    <ol className="onboarding__rank-list">
                      {draft.interests.map((code, i) => (
                        <li key={code} className={i < TOP_INTEREST_COUNT ? 'onboarding__rank-item onboarding__rank-item--top' : 'onboarding__rank-item'}>
                          <span className="onboarding__rank-num" aria-hidden="true">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="onboarding__rank-name">
                            <LineBadge code={code} showName size="sm" />
                            {i < TOP_INTEREST_COUNT ? (
                              <StatusTag tone="signal" icon="route">
                                {`Ưu tiên ${String(i + 1)}`}
                              </StatusTag>
                            ) : null}
                          </span>
                          <span className="onboarding__rank-actions">
                            <button
                              id={`ob-rank-${code}-up`}
                              type="button"
                              className="onboarding__icon-button"
                              aria-label={`Đưa ${CATEGORY_LABELS[code]} lên`}
                              disabled={i === 0}
                              onClick={() => {
                                move(code, -1);
                              }}
                            >
                              <Icon name="chevron-up" />
                            </button>
                            <button
                              id={`ob-rank-${code}-down`}
                              type="button"
                              className="onboarding__icon-button"
                              aria-label={`Đưa ${CATEGORY_LABELS[code]} xuống`}
                              disabled={i === draft.interests.length - 1}
                              onClick={() => {
                                move(code, 1);
                              }}
                            >
                              <Icon name="chevron-down" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ) : null}
              </>
            ) : null}

            {step === 'goals' ? (
              <fieldset className="onboarding__fieldset" aria-describedby={describedBy(errors.goals !== undefined && 'ob-goal-error')}>
                <legend className="onboarding__legend">Mục tiêu của bạn</legend>
                <ErrorText id="ob-goal-error" message={errors.goals} />
                <div className="onboarding__options onboarding__options--goals">
                  {GOALS.map((g) => (
                    <label key={g.id} className="onboarding__option">
                      <input
                        id={`ob-goal-${g.id}`}
                        type="checkbox"
                        checked={draft.goals.includes(g.id)}
                        onChange={() => {
                          update({ goals: toggleGoal(draft.goals, g.id) });
                        }}
                      />
                      <span className="onboarding__option-body">
                        <span className="onboarding__option-title">{g.label}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {step === 'time' ? (
              <>
                <fieldset className="onboarding__fieldset" aria-describedby={describedBy(errors.availability !== undefined && 'ob-time-error')}>
                  <legend className="onboarding__legend">Khoảng thời gian</legend>
                  <ErrorText id="ob-time-error" message={errors.availability} />
                  <div className="onboarding__options">
                    <label className="onboarding__option">
                      <input
                        id="ob-weekday"
                        type="checkbox"
                        checked={draft.weekdayAfterSchool}
                        onChange={(e) => {
                          update({ weekdayAfterSchool: e.target.checked });
                        }}
                      />
                      <span className="onboarding__option-body">
                        <span className="onboarding__option-title">Các ngày trong tuần, sau giờ học</span>
                        <span className="onboarding__option-text">Từ Thứ Hai đến Thứ Sáu, bắt đầu từ 16:30.</span>
                      </span>
                    </label>
                    <label className="onboarding__option">
                      <input
                        id="ob-weekend"
                        type="checkbox"
                        checked={draft.weekend}
                        onChange={(e) => {
                          update({ weekend: e.target.checked });
                        }}
                      />
                      <span className="onboarding__option-body">
                        <span className="onboarding__option-title">Cuối tuần</span>
                        <span className="onboarding__option-text">Thứ Bảy và Chủ nhật, cả ngày.</span>
                      </span>
                    </label>
                  </div>
                </fieldset>
                <div className="onboarding__field">
                  <div className="onboarding__budget-head">
                    <label htmlFor="ob-budget" className="onboarding__legend">
                      Quỹ giờ mỗi tuần
                    </label>
                    <output htmlFor="ob-budget" className="onboarding__budget-value">
                      <span className="mono">{draft.weeklyHourBudget}</span> giờ
                    </output>
                  </div>
                  <input
                    id="ob-budget"
                    className="onboarding__range"
                    type="range"
                    min={BUDGET_LIMITS.min}
                    max={BUDGET_LIMITS.max}
                    step={BUDGET_LIMITS.step}
                    value={draft.weeklyHourBudget}
                    aria-valuetext={`${String(draft.weeklyHourBudget)} giờ mỗi tuần`}
                    aria-describedby="ob-budget-hint"
                    onChange={(e) => {
                      update({
                        weeklyHourBudget: clampBudget(Number(e.target.value)),
                      });
                    }}
                  />
                  <p className="onboarding__range-scale" aria-hidden="true">
                    <span className="mono">{BUDGET_LIMITS.min}</span>
                    <span className="mono">{BUDGET_LIMITS.max}</span>
                  </p>
                  <p id="ob-budget-hint" className="onboarding__small">
                    Tổng số giờ bạn dự kiến dành cho hoạt động ngoại khóa trong một tuần, từ Thứ Hai đến Chủ nhật.
                  </p>
                </div>
              </>
            ) : null}

            <div className="onboarding__nav">
              {stepIndex > 0 ? (
                <Button
                  variant="secondary"
                  iconStart="arrow-left"
                  onClick={() => {
                    goTo(stepIndex - 1);
                  }}
                >
                  Quay lại
                </Button>
              ) : null}
              {step === 'time' ? null : (
                <Button type="submit" variant="primary" iconEnd="arrow-right">
                  Tiếp tục
                </Button>
              )}
            </div>
          </form>

          {step === 'time' ? (
            <section className="onboarding__proposal" aria-labelledby="ob-route-title">
              <div className="onboarding__mochi">
                <Mochi state={proposal && proposal.accepted.length > 0 ? 'answering' : 'idle'} />
              </div>
              <div className="onboarding__proposal-body">
                <p className="onboarding__eyebrow">Mochi đề xuất</p>
                <h2 id="ob-route-title" className="onboarding__h2">
                  Lộ trình đầu tiên
                </h2>
                {!profile || !proposal ? (
                  <p className="onboarding__hint">Vui lòng chọn ít nhất một khoảng thời gian có thể tham gia để Mochi đề xuất lộ trình đầu tiên.</p>
                ) : proposal.accepted.length === 0 ? (
                  <p className="onboarding__hint">
                    Hiện chưa có sự kiện còn mở đăng ký phù hợp với hồ sơ và quỹ giờ của bạn. Bạn có thể lưu hồ sơ; Mochi sẽ đề xuất khi có sự kiện mới.
                  </p>
                ) : (
                  <>
                    <p className="onboarding__hint">
                      Mochi đề xuất {proposal.accepted.length} sự kiện phù hợp với lĩnh vực ưu tiên, mục tiêu và quỹ giờ {profile.weeklyHourBudget} giờ mỗi tuần
                      của bạn. Bạn có thể bỏ chọn sự kiện chưa phù hợp; Rodemap chỉ đăng ký sau khi bạn xác nhận.
                    </p>
                    <ol className="first-route" aria-label="Các sự kiện trong lộ trình đề xuất">
                      {proposal.accepted.map((e) => {
                        const on = !excluded.has(e.id);
                        const start = toMillis(e.start);
                        return (
                          <li
                            key={e.id}
                            className={on ? 'first-route__item' : 'first-route__item first-route__item--off'}
                            style={
                              {
                                '--line': `var(--line-${e.category.toLowerCase()})`,
                              } as Record<string, string>
                            }
                          >
                            <span className="first-route__dot" aria-hidden="true" />
                            <div className="first-route__body">
                              <p className="first-route__meta">
                                <LineBadge code={e.category} size="sm" />
                                <MonoTime dateTime={e.start}>
                                  {formatDayLabel(start)} · {formatTimeRange(start, toMillis(e.end))}
                                </MonoTime>
                              </p>
                              <p className="first-route__title">{e.title}</p>
                              <p className="first-route__place">{e.location}</p>
                              {(reasonsById.get(e.id) ?? []).length > 0 ? (
                                <ul className="first-route__reasons" aria-label="Vì sao Mochi đề xuất">
                                  {(reasonsById.get(e.id) ?? []).map((r) => (
                                    <li key={r}>{r}</li>
                                  ))}
                                </ul>
                              ) : null}
                              <label className="first-route__toggle">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  aria-label={`Đưa vào lộ trình: ${e.title}`}
                                  onChange={() => {
                                    setExcluded((x) => {
                                      const s = new Set(x);
                                      if (s.has(e.id)) s.delete(e.id);
                                      else s.add(e.id);
                                      return s;
                                    });
                                  }}
                                />
                                <span>Đưa vào lộ trình</span>
                              </label>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}
                <div className="onboarding__finish">
                  {proposal && proposal.accepted.length > 0 ? (
                    <Button
                      variant="primary"
                      iconEnd="arrow-right"
                      disabled={chosen.length === 0}
                      onClick={() => {
                        finish(true);
                      }}
                    >
                      Xác nhận lộ trình
                    </Button>
                  ) : null}
                  <Button
                    variant={proposal && proposal.accepted.length > 0 ? 'secondary' : 'primary'}
                    onClick={() => {
                      finish(false);
                    }}
                  >
                    {proposal && proposal.accepted.length > 0 ? 'Chỉ lưu hồ sơ' : 'Lưu hồ sơ'}
                  </Button>
                </div>
                {proposal && proposal.accepted.length > 0 ? (
                  <p className="onboarding__small">
                    {chosen.length === 0
                      ? 'Vui lòng chọn ít nhất một sự kiện để xác nhận lộ trình.'
                      : `Khi bạn xác nhận, Rodemap lưu hồ sơ và đăng ký ${String(chosen.length)} sự kiện đã chọn.`}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          <p className="visually-hidden" aria-live="polite">
            {announcement}
          </p>
        </div>
      </div>
    </div>
  );
}
