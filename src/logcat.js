// Logcat line parsing. Returns { level, tag } when the line matches a known
// logcat format, otherwise null. Level coloring is the only consumer right now;
// `tag` is exposed for future tag-based grouping.

const DATE = String.raw`(?:\d{4}-)?\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3}`;
const LEVEL = `[VDIWEFA]`;

const THREADTIME = new RegExp(
  `^${DATE}\\s+\\d+\\s+\\d+\\s+(${LEVEL})\\s+([^:]+):`
);
const TIME = new RegExp(
  `^${DATE}\\s+(${LEVEL})/([^(:]+?)(?:\\(\\s*\\d+\\))?:`
);
const BRIEF = new RegExp(
  `^(${LEVEL})/([^(:]+?)(?:\\(\\s*\\d+\\))?:\\s`
);

export function parseLogcat(line) {
  let m = THREADTIME.exec(line);
  if (m) return { level: m[1], tag: m[2].trim() };
  m = TIME.exec(line);
  if (m) return { level: m[1], tag: m[2].trim() };
  m = BRIEF.exec(line);
  if (m) return { level: m[1], tag: m[2].trim() };
  return null;
}
