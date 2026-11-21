// Only the icons the layout still uses. Colour comes from `currentColor`.
const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
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

export function ArrowRightIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 12h15" />
      <path d="M13 6l6 6-6 6" />
    </Icon>
  );
}

export function DownloadIcon(props) {
  return (
    <Icon {...props}>
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  );
}
