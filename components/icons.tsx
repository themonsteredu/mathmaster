import type { SVGProps, ReactNode } from "react";

type P = { size?: number; className?: string };

function Icon({ children, size = 20, className = "" }: P & { children: ReactNode }) {
  return (
    <svg
      className={`icn ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconDashboard = (p: P) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
    <rect x="13.5" y="3.5" width="7" height="4" rx="1.2" />
    <rect x="13.5" y="10.5" width="7" height="10" rx="1.2" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
  </Icon>
);
export const IconRegister = (p: P) => (
  <Icon {...p}>
    <path d="M5 3.5h10l4 4V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5Z" />
    <path d="M15 3.5V7.5H19" />
    <path d="M9 12.5l5 5M14 12.5l-5 5" />
  </Icon>
);
export const IconBox = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2h7.5A1.5 1.5 0 0 1 20 9v9.5A1.5 1.5 0 0 1 18.5 20H5A1.5 1.5 0 0 1 3.5 18.5V7Z" />
    <path d="M9 14.5l2 2 4-4" />
  </Icon>
);
export const IconStudent = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
  </Icon>
);
export const IconTeacher = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="7" r="3" />
    <path d="M6 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" />
    <path d="M9.5 16.5h5" />
  </Icon>
);
export const IconStats = (p: P) => (
  <Icon {...p}>
    <path d="M4 20V11M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);
export const IconRepeat = (p: P) => (
  <Icon {...p}>
    <path d="M20 8a8 8 0 0 0-14.5-3M4 16a8 8 0 0 0 14.5 3" />
    <path d="M20 3v5h-5M4 21v-5h5" />
  </Icon>
);
export const IconCheck = (p: P) => (
  <Icon {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </Icon>
);
export const IconChevronRight = (p: P) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);
export const IconChevronLeft = (p: P) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
export const IconArrowRight = (p: P) => (
  <Icon {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Icon>
);
export const IconSearch = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Icon>
);
export const IconPlus = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const IconCamera = (p: P) => (
  <Icon {...p}>
    <path d="M3.5 8A1.5 1.5 0 0 1 5 6.5h2.5l1.5-2h6l1.5 2H19A1.5 1.5 0 0 1 20.5 8v10A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V8Z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);
export const IconUpload = (p: P) => (
  <Icon {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
  </Icon>
);
export const IconBell = (p: P) => (
  <Icon {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);
export const IconFilter = (p: P) => (
  <Icon {...p}>
    <path d="M3 5h18M6 12h12M10 19h4" />
  </Icon>
);
export const IconSettings = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </Icon>
);
export const IconLogout = (p: P) => (
  <Icon {...p}>
    <path d="M14 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3" />
    <path d="M10 12h11M18 8l4 4-4 4" />
  </Icon>
);
export const IconMore = (p: P) => (
  <Icon {...p}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </Icon>
);
export const IconBook = (p: P) => (
  <Icon {...p}>
    <path d="M4 4.5h7c1.7 0 3 1.3 3 3v13c0-1.4-1.3-2.5-3-2.5H4v-13.5Z" />
    <path d="M20 4.5h-6c-1.7 0-3 1.3-3 3v13c0-1.4 1.3-2.5 3-2.5h6v-13.5Z" />
  </Icon>
);

export const BrandMark = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 19V6l6 7 6-7v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="16" y="14" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const IllustEmpty = ({ size = 110 }: { size?: number }) => (
  <svg width={size} height={size * 0.75} viewBox="0 0 160 120" fill="none" aria-hidden="true" style={{ color: "var(--faint)" }}>
    <rect x="22" y="28" width="76" height="72" rx="4" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
    <rect x="38" y="14" width="76" height="72" rx="4" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
    <path d="M52 38h48M52 50h32M52 62h40" stroke="currentColor" strokeWidth="1.4" opacity="0.5" strokeLinecap="round" />
    <circle cx="124" cy="34" r="10" stroke="currentColor" strokeWidth="1.4" />
    <path d="M120 30l8 8M128 30l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export type IconType = (p: P) => React.JSX.Element;
export type { SVGProps };
