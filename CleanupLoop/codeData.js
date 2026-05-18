// codeData.js
//
// All content + audit timing for the cleanup loop.
//
// The animation tells a single story: a junked-up TypeScript file
// is audited, debris is flagged, then each junk line strikes through
// and collapses. Edit the file contents and audit-finding labels
// here when you want to change what's on screen.
//
// Data shape:
//   CODE_LINES        – the "before" file, one entry per source line
//     .tokens           [class, text] pairs that drive syntax coloring
//     .junk             "stale-comment" | "stale-todo" | "dead-import"
//                       | "dead-const" | "wrong-doc" | "commented-out"
//                       | "dead-fn" | null
//     .removeAt         seconds into the loop when the line begins its
//                       removal animation (null = stays in the cleaned file)
//
//   AUDIT_FINDINGS    – what the auditor surfaces, in order
//     .at               seconds into the loop when this finding appears
//     .line             index into CODE_LINES
//     .kind             classification (matches a .junk value)
//     .label            UPPERCASE annotation that floats to the right of the line
//
//   TOKEN_COLOR       – syntax-highlighting palette. Each entry resolves
//                       to a CSS custom property from the design system,
//                       so palette tweaks at the system level are picked
//                       up automatically.
//
// The file is loaded as a plain script (no module system) and exposes
// its exports on `window` so CleanupLoop.jsx can read them.

/* global window */

const KW = "kw", STR = "str", FN = "fn", TY = "ty",
      CM = "cm", NUM = "num", VAR = "var", PUN = "pun", TXT = "txt";

// terse [class, text] tuple constructor
const t = (cls, s) => [cls, s];

const CODE_LINES = [
  { tokens: [t(CM, "// Last touched Jan 2023 — needs revisit before v2 cut")],
    junk: "stale-comment", removeAt: 7.00 },

  { tokens: [t(KW, "import"), t(TXT, " { "), t(VAR, "Logger"), t(TXT, " } "),
             t(KW, "from"), t(STR, " './lib/logger'"), t(PUN, ";")],
    junk: null, removeAt: null },

  { tokens: [t(KW, "import"), t(TXT, " { "), t(VAR, "Cache"), t(TXT, " } "),
             t(KW, "from"), t(STR, " './lib/cache'"), t(PUN, ";")],
    junk: null, removeAt: null },

  { tokens: [t(KW, "import"), t(TXT, " { "), t(VAR, "OldUserService"), t(TXT, " } "),
             t(KW, "from"), t(STR, " './deprecated/users'"), t(PUN, ";")],
    junk: "dead-import", removeAt: 7.50 },

  { tokens: [t(KW, "import"), t(TXT, " { "), t(FN, "formatLegacy"), t(TXT, " } "),
             t(KW, "from"), t(STR, " './utils/legacy'"), t(PUN, ";")],
    junk: "dead-import", removeAt: 7.70 },

  { tokens: [t(KW, "import type"), t(TXT, " { "), t(TY, "UserDTO"), t(TXT, ", "),
             t(TY, "UserV1"), t(TXT, " } "), t(KW, "from"), t(STR, " './types'"),
             t(PUN, ";")],
    junk: "dead-import", removeAt: 8.0 },

  { tokens: [], junk: null, removeAt: null },

  { tokens: [t(KW, "const"), t(TXT, " "), t(VAR, "CACHE_TTL"), t(TXT, " = "),
             t(NUM, "3600"), t(PUN, ";")],
    junk: null, removeAt: null },

  { tokens: [t(KW, "const"), t(TXT, " "), t(VAR, "LEGACY_MODE"), t(TXT, " = "),
             t(KW, "false"), t(PUN, ";")],
    junk: "dead-const", removeAt: 8.5 },

  { tokens: [], junk: null, removeAt: null },

  { tokens: [t(CM, "/**")], junk: null, removeAt: null },
  { tokens: [t(CM, " * Returns a user by ID. Deprecated: removed in v2.")],
    junk: "wrong-doc", removeAt: 9.0 },
  { tokens: [t(CM, " * @param id  the user identifier")],
    junk: null, removeAt: null },
  { tokens: [t(CM, " * @param opts  unused options bag")],
    junk: "wrong-doc", removeAt: 9.3 },
  { tokens: [t(CM, " */")], junk: null, removeAt: null },

  { tokens: [t(KW, "export async"), t(TXT, " "), t(KW, "function"), t(TXT, " "),
             t(FN, "getUser"), t(PUN, "("), t(VAR, "id"), t(PUN, ": "),
             t(TY, "string"), t(PUN, ") {")],
    junk: null, removeAt: null },

  { tokens: [t(TXT, "  "), t(CM, "// TODO(2023-04): switch to /v2 endpoint")],
    junk: "stale-todo", removeAt: 10.0 },

  { tokens: [t(TXT, "  "), t(KW, "const"), t(TXT, " "), t(VAR, "cached"),
             t(TXT, " = "), t(VAR, "cache"), t(PUN, "."), t(FN, "get"),
             t(PUN, "("), t(VAR, "id"), t(PUN, ");")],
    junk: null, removeAt: null },

  { tokens: [t(TXT, "  "), t(KW, "if"), t(TXT, " ("), t(VAR, "cached"),
             t(PUN, ") "), t(KW, "return"), t(TXT, " "), t(VAR, "cached"),
             t(PUN, ";")],
    junk: null, removeAt: null },

  { tokens: [t(TXT, "  "),
             t(CM, "// const legacy = await OldUserService.get(id);")],
    junk: "commented-out", removeAt: 10.7 },

  { tokens: [t(TXT, "  "),
             t(CM, "// if (LEGACY_MODE) return formatLegacy(legacy);")],
    junk: "commented-out", removeAt: 10.9 },

  { tokens: [t(TXT, "  "), t(KW, "const"), t(TXT, " "), t(VAR, "user"),
             t(TXT, " = "), t(KW, "await"), t(TXT, " "), t(VAR, "db"),
             t(PUN, "."), t(VAR, "users"), t(PUN, "."), t(FN, "findOne"),
             t(PUN, "({ "), t(VAR, "id"), t(PUN, " });")],
    junk: null, removeAt: null },

  { tokens: [t(TXT, "  "), t(KW, "return"), t(TXT, " "), t(VAR, "user"),
             t(PUN, ";")],
    junk: null, removeAt: null },

  { tokens: [t(PUN, "}")], junk: null, removeAt: null },

  // trailing blank that's left orphaned once the dead function below
  // sweeps. Swept too so the cleaned file ends cleanly at 14 lines.
  { tokens: [], junk: null, removeAt: 12.6 },

  { tokens: [t(CM, "// TODO: implement getUserSync")],
    junk: "stale-todo", removeAt: 11.8 },

  { tokens: [t(KW, "export"), t(TXT, " "), t(KW, "function"), t(TXT, " "),
             t(FN, "getUserSync"), t(PUN, "("), t(VAR, "id"), t(PUN, ": "),
             t(TY, "string"), t(PUN, "): "), t(TY, "never"), t(PUN, " {")],
    junk: "dead-fn", removeAt: 12.0 },

  { tokens: [t(TXT, "  "), t(KW, "throw new"), t(TXT, " "), t(FN, "Error"),
             t(PUN, "("), t(STR, "'not implemented'"), t(PUN, ");")],
    junk: "dead-fn", removeAt: 12.2 },

  { tokens: [t(PUN, "}")], junk: "dead-fn", removeAt: 12.4 },
];

const AUDIT_FINDINGS = [
  { at: 4.20, line: 0,  kind: "stale-comment", label: "stale comment" },
  { at: 4.45, line: 3,  kind: "dead-import",   label: "dead import" },
  { at: 4.65, line: 4,  kind: "dead-import",   label: "dead import" },
  { at: 4.85, line: 5,  kind: "dead-import",   label: "unused type" },
  { at: 5.05, line: 8,  kind: "dead-const",    label: "dead constant" },
  { at: 5.30, line: 11, kind: "wrong-doc",     label: "wrong jsdoc" },
  { at: 5.50, line: 13, kind: "wrong-doc",     label: "wrong @param" },
  { at: 5.75, line: 16, kind: "stale-todo",    label: "stale TODO (3y)" },
  { at: 5.95, line: 19, kind: "commented-out", label: "commented code" },
  { at: 6.15, line: 20, kind: "commented-out", label: "commented code" },
  { at: 6.35, line: 25, kind: "stale-todo",    label: "stale TODO" },
  { at: 6.55, line: 26, kind: "dead-fn",       label: "dead function" },
];

// Each token kind resolves to a CSS custom property defined in
// colors_and_type.css. Touching this map is how you re-aim the
// syntax palette without forking the component.
const TOKEN_COLOR = {
  kw:  "var(--accent)",   // keywords — vermillion
  str: "var(--success)", // strings — sage green
  fn:  "var(--info)",    // function names — slate blue
  ty:  "var(--terminal-accent)",  // types — ochre
  cm:  "var(--text-3)",    // comments — muted
  num: "var(--accent-soft)",      // numerics — soft vermillion
  var: "var(--text-1)",     // identifiers — ink
  pun: "var(--text-2)",   // punctuation — secondary ink
  txt: "var(--text-1)",     // plain text — ink
};

// Expose on window so CleanupLoop.jsx (loaded next) can read these
// without needing a module system. If you switch to ES modules,
// replace this block with `export { CODE_LINES, AUDIT_FINDINGS, TOKEN_COLOR };`
// and add matching imports in CleanupLoop.jsx.
if (typeof window !== "undefined") {
  Object.assign(window, { CODE_LINES, AUDIT_FINDINGS, TOKEN_COLOR });
}
