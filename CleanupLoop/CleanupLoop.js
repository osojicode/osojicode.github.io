// CleanupLoop.jsx
//
// A self-contained, looping animation of an osojicode audit + sweep.
// Renders a single source file: junk lines get annotated in the right
// margin, then strike through and collapse, leaving a cleaned file.
//
// Usage:
//   <script type="text/babel" src="CleanupLoop/codeData.js"></script>
//   <script type="text/babel" src="CleanupLoop/CleanupLoop.jsx"></script>
//
//   <CleanupLoop />
//
// Props (all optional):
//   duration   – loop length in seconds. Default 22.
//                The audit + sweep choreography is tuned for this; if
//                you change it dramatically you'll want to retime the
//                .removeAt and .at values in codeData.js.
//   filePath   – caption shown above the code. Default "src / handlers / user.ts".
//   style      – inline style passed to the outer container. Use it to
//                size the loop (it fills its parent by default).
//   className  – class name on the outer container, for CSS overrides.
//
// All colors and fonts resolve to CSS custom properties from the
// design system (--text-*, --accent, --surface-*, --font-*) — palette
// and typography changes shipped at the system level cascade in.
//
// Depends on codeData.js, which exposes CODE_LINES, AUDIT_FINDINGS, and
// TOKEN_COLOR on `window`. Both files load as plain scripts (no module
// system); adapt the bottom of each file if you migrate to ES modules.

/* global React, CODE_LINES, AUDIT_FINDINGS, TOKEN_COLOR */

// ── Layout constants ─────────────────────────────────────────────────
// The animation draws into a fixed-size internal canvas (CANVAS_W ×
// CANVAS_H) and scales the whole thing to fit its container. The
// per-line metrics drive both the layout and the collapse animation,
// so adjust them as a group if you re-tune.

const CANVAS_W = 800;
const CANVAS_H = 1180;
const LH = 36; // line height
const FONT_PX = 22; // code font size
const GUTTER_W = 64; // line-number gutter width
const EDITOR_PAD_Y = 22;
const ANNOT_W = 200; // reserved right-side annotation column (canvas units)
const ANNOT_GAP = 18; // gap between code edge and annotation column

// ── Math + easing helpers ───────────────────────────────────────────

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const Easing = {
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInCubic: t => t * t * t,
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
};

// ── Timeline context ─────────────────────────────────────────────────
// Children read the current loop time via useTime(). The top-level
// CleanupLoop component owns the rAF tick and provides the value.

const TimelineContext = React.createContext({
  time: 0,
  duration: 22
});
const useTime = () => React.useContext(TimelineContext).time;

// ── Per-line removal state ───────────────────────────────────────────
//
// Each junk line goes through a four-phase exit, controlled by `dt`
// (seconds since the line's .removeAt fires):
//
//   0    → 0.18   vermillion highlight fades in behind the line
//   0.18 → 0.55   strikethrough sweep crosses the text L→R
//   0.55 → 0.85   text + bg fade out
//   0.70 → 1.05   line height collapses, lines below slide up
//
// A non-junk line (removeAt == null) returns the resting state.

function lineState(line, t) {
  if (line.removeAt == null || t < line.removeAt) {
    return {
      opacity: 1,
      strikeFrac: 0,
      bg: 0,
      height: LH,
      removed: false
    };
  }
  const dt = t - line.removeAt;
  const bg = dt < 0.18 ? Easing.easeOutCubic(dt / 0.18) * 0.85 : Math.max(0, 1 - (dt - 0.55) / 0.30) * 0.85;
  const strikeFrac = clamp((dt - 0.18) / 0.37, 0, 1);
  const opacity = dt < 0.55 ? 1 : Math.max(0, 1 - (dt - 0.55) / 0.30);
  const collapseT = clamp((dt - 0.70) / 0.35, 0, 1);
  const height = LH * (1 - Easing.easeInOutCubic(collapseT));
  return {
    opacity,
    strikeFrac,
    bg,
    height,
    removed: collapseT >= 1
  };
}

// Cumulative Y for each line + the displayed line number. Numbers
// re-count from 1 through whatever rows are still visible, so the
// gutter stays sequential as junk collapses.
function computeLayout(lines, t) {
  const ys = [];
  const nums = [];
  let y = 0;
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const s = lineState(lines[i], t);
    ys.push(y);
    if (s.height > 0.1) {
      n += 1;
      nums.push(n);
    } else {
      nums.push(null);
    }
    y += s.height;
  }
  return {
    ys,
    nums
  };
}

// Marker opacity envelope — fades in at finding.at, fades out as the
// corresponding line is swept.
function markerOpacity(finding, line, t) {
  const fadeIn = clamp((t - finding.at) / 0.35, 0, 1);
  const fadeOut = line.removeAt != null ? clamp(1 - (t - line.removeAt) / 0.35, 0, 1) : 1;
  return Easing.easeOutCubic(fadeIn) * fadeOut;
}

// ── CodeLine ─────────────────────────────────────────────────────────

function CodeLine({
  index,
  displayNum,
  line,
  y,
  t
}) {
  const s = lineState(line, t);
  if (s.height <= 0.1) return null;

  // Earliest finding time for this source-line index, if any. The gutter
  // number stays muted until the audit flags this line — no spoilers.
  let firstFinding = Infinity;
  for (const f of AUDIT_FINDINGS) {
    if (f.line === index && f.at < firstFinding) firstFinding = f.at;
  }
  const flagged = line.junk && t >= firstFinding;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: EDITOR_PAD_Y + y,
      right: ANNOT_W,
      height: LH,
      display: "flex",
      alignItems: "center",
      fontFamily: "var(--font-mono)",
      fontSize: FONT_PX,
      lineHeight: `${LH}px`,
      opacity: s.opacity,
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: GUTTER_W - 6,
      right: 0,
      top: 0,
      bottom: 0,
      background: "var(--accent)",
      opacity: s.bg * 0.10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      width: GUTTER_W,
      flexShrink: 0,
      textAlign: "right",
      paddingRight: 18,
      color: flagged ? "var(--accent)" : "var(--text-muted)",
      opacity: flagged ? 0.7 : 0.5,
      fontSize: 16,
      fontVariantNumeric: "tabular-nums"
    }
  }, displayNum != null ? displayNum : ""), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      position: "relative",
      whiteSpace: "pre",
      overflow: "hidden",
      maskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
      WebkitMaskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)"
    }
  }, line.tokens.map(([cls, txt], i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      color: TOKEN_COLOR[cls] || "var(--text-1)"
    }
  }, txt)), s.strikeFrac > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      top: "50%",
      height: 1.5,
      background: "var(--accent)",
      width: `${s.strikeFrac * 100}%`
    }
  })));
}

// ── Marker ───────────────────────────────────────────────────────────

function Marker({
  finding,
  line,
  y,
  t
}) {
  const op = markerOpacity(finding, line, t);
  if (op <= 0.01) return null;
  const slideIn = Easing.easeOutCubic(clamp((t - finding.at) / 0.35, 0, 1));
  const tx = (1 - slideIn) * -14;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      right: 0,
      width: ANNOT_W,
      top: EDITOR_PAD_Y + y,
      height: LH,
      paddingLeft: ANNOT_GAP,
      display: "flex",
      alignItems: "center",
      gap: 8,
      transform: `translateX(${tx}px)`,
      opacity: op,
      fontFamily: "var(--font-mono)",
      fontSize: 14,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      color: "var(--accent)",
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 16
    }
  }, "\u25C0"), /*#__PURE__*/React.createElement("span", null, finding.label));
}

// ── Stage — the bare code panel ─────────────────────────────────────

function Stage({
  filePath
}) {
  const t = useTime();
  const {
    ys,
    nums
  } = computeLayout(CODE_LINES, t);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 40,
      top: 40,
      right: 40,
      bottom: 40,
      fontFamily: "var(--font-mono)",
      overflow: "hidden",
      background: "transparent"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: `4px 0 18px ${GUTTER_W}px`,
      fontFamily: "var(--font-mono)",
      fontSize: 16,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, filePath), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      padding: `${EDITOR_PAD_Y}px 0`
    }
  }, CODE_LINES.map((line, i) => /*#__PURE__*/React.createElement(CodeLine, {
    key: i,
    index: i,
    displayNum: nums[i],
    line: line,
    y: ys[i],
    t: t
  })), AUDIT_FINDINGS.map((f, i) => /*#__PURE__*/React.createElement(Marker, {
    key: i,
    finding: f,
    line: CODE_LINES[f.line],
    y: ys[f.line],
    t: t
  }))));
}

// ── Top-level CleanupLoop ───────────────────────────────────────────
//
// Owns the rAF tick (loops continuously), the resize observer (scales
// the internal CANVAS_W × CANVAS_H stage to fit its container), and
// applies a short seam-fade at the loop boundary so the wraparound is
// invisible.

function CleanupLoop({
  duration = 22,
  filePath = "src / handlers / user.ts",
  style,
  className
} = {}) {
  const [time, setTime] = React.useState(0);
  const [scale, setScale] = React.useState(1);
  const wrapRef = React.useRef(null);

  // Respect OS-level reduced-motion preference. When set, render the
  // post-sweep clean state once and skip the rAF tick entirely.
  const reduceMotion = typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Animation tick — single loop, continuous (skipped under reduce-motion)
  React.useEffect(() => {
    if (reduceMotion) {
      setTime(14); // final frame after sweep completes, before seam fade
      return;
    }
    let raf,
      last = null;
    const tick = ts => {
      if (last == null) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      setTime(prev => (prev + dt) % duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [duration, reduceMotion]);

  // Auto-scale to fit parent
  React.useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const measure = () => {
      const s = Math.min(el.clientWidth / CANVAS_W, el.clientHeight / CANVAS_H);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Seam fade at loop boundary
  const FADE = 0.7;
  let envOp = 1;
  if (time < FADE) envOp = Easing.easeOutCubic(time / FADE);else if (time > duration - FADE) envOp = Easing.easeInCubic((duration - time) / FADE);
  envOp = clamp(envOp, 0, 1);
  const ctxValue = React.useMemo(() => ({
    time,
    duration
  }), [time, duration]);
  return /*#__PURE__*/React.createElement("div", {
    ref: wrapRef,
    className: className,
    style: {
      position: "relative",
      width: "100%",
      height: "100%",
      background: "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: CANVAS_W,
      height: CANVAS_H,
      position: "relative",
      transform: `scale(${scale})`,
      transformOrigin: "center",
      flexShrink: 0,
      opacity: envOp
    }
  }, /*#__PURE__*/React.createElement(TimelineContext.Provider, {
    value: ctxValue
  }, /*#__PURE__*/React.createElement(Stage, {
    filePath: filePath
  }))));
}

// Expose on window for script-tag setups. Replace with
// `export default CleanupLoop;` if you migrate to ES modules.
if (typeof window !== "undefined") {
  window.CleanupLoop = CleanupLoop;
}