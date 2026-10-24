import { Button } from '../atoms/Button';
import './SetupInvite.css';

export interface SetupInviteProps {
  /** Heading of the invitation. */
  title: string;
  /** What the profile unlocks here, one formal sentence. */
  text: string;
  /** Thiết lập hồ sơ with the way back (useSetupHref). */
  to: string;
  headingLevel?: 2 | 3;
}

/** Shown to a visitor in place of an action that needs a profile (DESIGN.md §7.2). */
export function SetupInvite({ title, text, to, headingLevel = 2 }: SetupInviteProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="setup-invite">
      <Heading className="setup-invite__title">{title}</Heading>
      <p className="setup-invite__text">{text}</p>
      <div className="cluster">
        <Button to={to} variant="primary" iconEnd="arrow-right">
          Thiết lập hồ sơ
        </Button>
      </div>
    </div>
  );
}
