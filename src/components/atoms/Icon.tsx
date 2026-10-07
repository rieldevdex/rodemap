import './Icon.css';

/** Circle as a path, so every icon is a list of `d` strings on a 20-unit grid. */
function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

const PATHS = {
  check: ['M4.5 10.5 8 14l7.5-8'],
  alert: ['M10 3 2.5 16.5h15L10 3Z', 'M10 8.25v3.75', 'M10 14.4v.1'],
  clock: [circle(10, 10, 7), 'M10 6.25V10l2.5 2'],
  x: ['M5 5l10 10', 'M15 5 5 15'],
  calendar: ['M3 4.75h14v12H3z', 'M3 8.5h14', 'M7 3v3.25', 'M13 3v3.25'],
  search: [circle(8.75, 8.75, 5.25), 'm12.75 12.75 4.25 4.25'],
  sun: [
    circle(10, 10, 3.5),
    'M10 2v1.75',
    'M10 16.25V18',
    'M2 10h1.75',
    'M16.25 10H18',
    'm4.35 4.35 1.25 1.25',
    'm14.4 14.4 1.25 1.25',
    'm4.35 15.65 1.25-1.25',
    'm14.4 5.6 1.25-1.25',
  ],
  moon: ['M16.5 12.25A6.75 6.75 0 0 1 7.75 3.5a6.75 6.75 0 1 0 8.75 8.75Z'],
  user: [circle(10, 6.75, 3.5), 'M3.5 17.25c.75-3.25 3.4-5.25 6.5-5.25s5.75 2 6.5 5.25'],
  'chevron-down': ['m5 7.5 5 5 5-5'],
  'chevron-up': ['m5 12.5 5-5 5 5'],
  'chevron-right': ['m7.5 5 5 5-5 5'],
  'chevron-left': ['m12.5 5-5 5 5 5'],
  download: ['M10 3v9.5', 'm6 9 4 4 4-4', 'M4 16.5h12'],
  external: ['M11.5 3.5h5v5', 'm16.5 3.5-7 7', 'M14 11.5v5H3.5V6h5'],
  'map-pin': ['M10 17.5s5.5-4.75 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.75 5.5 9.5 5.5 9.5Z', circle(10, 8, 2)],
  users: [
    circle(7.5, 7, 3),
    'M2 16.5c.6-2.75 2.8-4.5 5.5-4.5s4.9 1.75 5.5 4.5',
    'M13.25 4.25a3 3 0 0 1 0 5.5',
    'M15.25 12.4c1.4.6 2.4 2 2.75 4.1',
  ],
  filter: ['M3 5h14', 'M5.75 10h8.5', 'M8.5 15h3'],
  list: ['M7.5 5.5H17', 'M7.5 10H17', 'M7.5 14.5H17', 'M3.5 5.5h.01', 'M3.5 10h.01', 'M3.5 14.5h.01'],
  menu: ['M3 5.5h14', 'M3 10h14', 'M3 14.5h14'],
  map: ['M2.75 5.25 7.5 3.25l5 2 4.75-2v11.5l-4.75 2-5-2-4.75 2z', 'M7.5 3.25v11.5', 'M12.5 5.25v11.5'],
  plus: ['M10 4v12', 'M4 10h12'],
  minus: ['M4 10h12'],
  'arrow-right': ['M3.5 10h13', 'm11.5 5 5 5-5 5'],
  'arrow-left': ['M16.5 10h-13', 'm8.5 5-5 5 5 5'],
  info: [circle(10, 10, 7), 'M10 9v4.75', 'M10 6.4v.1'],
  print: ['M6 7.5V3h8v4.5', 'M5.5 14H3V7.5h14V14h-2.5', 'M6 11.5h8V17H6z'],
  route: [circle(4.5, 15.5, 2), circle(15.5, 4.5, 2), 'M6.5 15.5h2a2.5 2.5 0 0 0 2.5-2.5V7a2.5 2.5 0 0 1 2.5-2.5'],
} satisfies Record<string, string[]>;

export type IconName = keyof typeof PATHS;
export const ICON_NAMES = Object.keys(PATHS) as IconName[];

export interface IconProps {
  name: IconName;
  /** 'md' = 20 px (--size-icon), 'sm' = 16 px (--size-icon-sm). */
  size?: 'md' | 'sm';
  /** Accessible name. Omit for decorative icons next to visible text (then aria-hidden). */
  title?: string;
  className?: string;
}

/** Inline SVG icon on a 20-unit grid, stroked with currentColor. */
export function Icon({ name, size = 'md', title, className }: IconProps) {
  const classes = ['icon', size === 'sm' ? 'icon--sm' : null, className].filter(Boolean).join(' ');
  return (
    <svg
      className={classes}
      viewBox="0 0 20 20"
      role={title === undefined ? undefined : 'img'}
      aria-label={title}
      aria-hidden={title === undefined ? true : undefined}
      focusable="false"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
