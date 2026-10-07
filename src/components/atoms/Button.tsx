import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { Link } from '../../router/Link';
import { Icon, type IconName } from './Icon';
import './Button.css';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface CommonProps {
  /** primary = signal fill (one per view), secondary = ink outline, quiet = text only. */
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  iconStart?: IconName | undefined;
  iconEnd?: IconName | undefined;
  /** Stretch to the container width (phones, sheets). */
  block?: boolean | undefined;
  children?: ReactNode;
  className?: string | undefined;
}

export type ButtonAsButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    to?: undefined;
    ref?: Ref<HTMLButtonElement>;
  };

export type ButtonAsLinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps | 'href'> & {
    /** Renders an <a> through the router's Link. */
    to: string;
    ref?: Ref<HTMLAnchorElement>;
  };

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps;

function classNames({ variant = 'primary', size = 'md', block = false, className }: CommonProps): string {
  return ['button', `button--${variant}`, `button--${size}`, block ? 'button--block' : null, className]
    .filter(Boolean)
    .join(' ');
}

function Content({ iconStart, iconEnd, children }: Pick<CommonProps, 'iconStart' | 'iconEnd' | 'children'>) {
  return (
    <>
      {iconStart ? <Icon name={iconStart} /> : null}
      {children === undefined ? null : <span className="button__label">{children}</span>}
      {iconEnd ? <Icon name={iconEnd} /> : null}
    </>
  );
}

/** Verb-labelled action. Renders <a> via Link when `to` is given, otherwise <button type="button">. */
export function Button(props: ButtonProps) {
  if (typeof props.to === 'string') {
    const { variant, size, block, className, iconStart, iconEnd, children, to, ...rest } = props;
    return (
      <Link {...rest} to={to} className={classNames({ variant, size, block, className })}>
        <Content iconStart={iconStart} iconEnd={iconEnd}>
          {children}
        </Content>
      </Link>
    );
  }
  const { variant, size, block, className, iconStart, iconEnd, children, type, ...rest } = props;
  return (
    <button {...rest} type={type ?? 'button'} className={classNames({ variant, size, block, className })}>
      <Content iconStart={iconStart} iconEnd={iconEnd}>
        {children}
      </Content>
    </button>
  );
}
