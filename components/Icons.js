// Inline SVG icons. They inherit colour from `currentColor`, so colour is set with CSS.
const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

function Icon({ children, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" {...baseProps} {...props}>
      {children}
    </svg>
  );
}

export function PumpIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
      <path d="M3 21h13" />
      <path d="M15 9h1.5A2.5 2.5 0 0 1 19 11.5V17a2 2 0 0 0 4 0V8l-2-2" />
      <path d="M7 8h5" />
      <path d="M7 12h5" />
    </Icon>
  );
}

export function TruckIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 6h12v10H2z" />
      <path d="M14 10h4l4 4v2h-8z" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </Icon>
  );
}

export function DropletIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z" />
    </Icon>
  );
}

export function FlameIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3c.5 3.2 4.5 5.2 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2.1 1-3.6 2.2-4.8.2 1.5.8 2.5 1.8 3.1-.3-2.7.2-5.1.5-7.8z" />
    </Icon>
  );
}

export function TargetIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </Icon>
  );
}

export function EyeIcon(props) {
  return (
    <Icon {...props}>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function MailIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </Icon>
  );
}

export function PhoneIcon(props) {
  return (
    <Icon {...props}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </Icon>
  );
}

export function PinIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Icon>
  );
}

export function ChatIcon(props) {
  return (
    <Icon {...props}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.3A8.5 8.5 0 1 1 21 11.5z" />
    </Icon>
  );
}

export function ArrowRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Icon>
  );
}

export function DownloadIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </Icon>
  );
}

export function FacebookIcon(props) {
  return (
    <Icon {...props}>
      <path d="M14 21v-8h3l.5-3.5H14V7.5c0-1 .4-1.5 1.5-1.5h2V3h-2.7C12.8 3 11 4.5 11 7v2.5H8V13h3v8z" />
    </Icon>
  );
}

export function LinkedInIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 10v7" />
      <path d="M8 7v.01" />
      <path d="M12 17v-7" />
      <path d="M12 13a3 3 0 0 1 6 0v4" />
    </Icon>
  );
}

export function CartIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.7 12.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6" />
    </Icon>
  );
}

export function WashIcon(props) {
  return (
    <Icon {...props}>
      <path d="M10 4s4.5 4.6 4.5 7.6a4.5 4.5 0 0 1-9 0C5.5 8.6 10 4 10 4z" />
      <path d="M18 3v4" />
      <path d="M16 5h4" />
    </Icon>
  );
}

export function TyreIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v5" />
      <path d="M12 16v5" />
      <path d="M3 12h5" />
      <path d="M16 12h5" />
    </Icon>
  );
}

export function UsersIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18.5 14.8c1.7.8 2.8 2.6 3 5.2" />
    </Icon>
  );
}

export function StationIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 21V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15" />
      <path d="M3 21h13" />
      <path d="M15 9h2a2 2 0 0 1 2 2v7a1.5 1.5 0 0 0 3 0V8l-2-2" />
      <path d="M7 8h5" />
    </Icon>
  );
}

export function StorageIcon(props) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.5" />
      <path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13" />
      <path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
    </Icon>
  );
}

export function ClockIcon(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}
