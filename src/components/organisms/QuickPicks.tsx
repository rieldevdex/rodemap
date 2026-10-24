import { useId } from 'react';
import { CATEGORIES } from '../../data/categories';
import { setGuestGrade, toggleGuestInterest } from '../../domain/guest';
import { GRADE_LEVELS, type GuestPicks } from '../../domain/types';
import { Chip } from '../atoms/Chip';
import './QuickPicks.css';

export interface QuickPicksProps {
  picks: GuestPicks;
  onChange: (picks: GuestPicks) => void;
}

/**
 * "Gợi ý nhanh" (DESIGN.md §5, §7.2): a visitor's grade as a radio row grouped by level and
 * the fields as toggle chips with their category edge. Suggestions follow each change.
 */
export function QuickPicks({ picks, onChange }: QuickPicksProps) {
  const uid = useId();
  const gradeName = `${uid}-grade`;
  return (
    <div className="quick-picks">
      <fieldset className="quick-picks__group">
        <legend className="quick-picks__legend">Khối</legend>
        <div className="quick-picks__grades">
          <label className="quick-picks__grade quick-picks__grade--all">
            <input
              type="radio"
              name={gradeName}
              checked={picks.grade === null}
              onChange={() => {
                onChange(setGuestGrade(picks, null));
              }}
            />
            <span>Chưa chọn</span>
          </label>
          {GRADE_LEVELS.map((level) => (
            <div key={level.name} className="quick-picks__level" role="group" aria-label={level.name}>
              <span className="quick-picks__level-name" aria-hidden="true">
                {level.name}
              </span>
              <div className="quick-picks__row">
                {level.grades.map((g) => (
                  <label key={g} className="quick-picks__grade">
                    <input
                      type="radio"
                      name={gradeName}
                      checked={picks.grade === g}
                      onChange={() => {
                        onChange(setGuestGrade(picks, g));
                      }}
                    />
                    <span>Khối {g}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset className="quick-picks__group">
        <legend className="quick-picks__legend">Lĩnh vực quan tâm</legend>
        <div className="quick-picks__fields">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.code}
              code={c.code}
              pressed={picks.interests.includes(c.code)}
              onClick={() => {
                onChange(toggleGuestInterest(picks, c.code));
              }}
            >
              {c.name}
            </Chip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
