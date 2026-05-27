// Detects Apple `os_log` / `log show` / `log stream` lines and maps their
// level keywords to the same severity letters used by logcat so the
// existing .lc-* CSS classes light up correctly.

// Matches `log show --style syslog` and `log stream` output:
//   2026-05-27 10:08:42.123456+0300 0x1a2b3c   Default   0x0   1234  0   MyApp: hello
const OSLOG_SYSLOG = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+[+-]\d{4}\s+0x[\da-fA-F]+\s+(Debug|Info|Notice|Default|Error|Fault)\b/;

// Matches `log show` "compact" / table output where the level is the
// second whitespace-separated column right after the timestamp.
//   2026-05-27 10:08:42.123456+0300  Default  com.appsflyer.sdk  ...
const OSLOG_TABLE = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+[+-]\d{4}\s+(Debug|Info|Notice|Default|Error|Fault)\b/;

const LEVEL_MAP = {
  Debug: 'V',
  Info: 'I',
  Notice: 'D', // legacy alias for Default in Apple's unified logging
  Default: 'D',
  Error: 'E',
  Fault: 'F',
};

export function parseOSLog(line) {
  const m = OSLOG_SYSLOG.exec(line) || OSLOG_TABLE.exec(line);
  if (!m) return null;
  return { level: LEVEL_MAP[m[1]] };
}
