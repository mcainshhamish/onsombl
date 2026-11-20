import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

const base: P = {
  width: 19,
  height: 19,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const ConversationIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12a8 8 0 1 1 3.2 6.4L3 20l1.4-3.8A7.9 7.9 0 0 1 4 12Z" />
  </svg>
);

export const AnalyticsIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h16M7 17v-5M12 17V6M17 17v-8" />
  </svg>
);

export const ProjectIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M3.5 9h17M10 9v11.5M16 9v11.5" />
  </svg>
);

export const SettingsIcon = (p: P) => (
  <svg {...base} width={18} height={18} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8l1.6 2.2 2.7-.5.9 2.6 2.5 1.2-.7 2.7 1.7 2.1-1.9 2-.2 2.8-2.7.6-1.5 2.3-2.5-1.1-2.5 1.1-1.5-2.3-2.7-.6-.2-2.8-1.9-2 1.7-2.1-.7-2.7 2.5-1.2.9-2.6 2.7.5Z" />
  </svg>
);

export const ChevronDown = (p: P) => (
  <svg {...base} width={14} height={14} strokeWidth={2} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base} width={14} height={14} strokeWidth={1.6} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const GuideIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3M9 8h6M9 12h6" />
  </svg>
);
