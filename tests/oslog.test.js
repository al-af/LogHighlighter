import { describe, it, expect } from 'vitest';
import { parseOSLog } from '../src/oslog.js';

describe('parseOSLog', () => {
  it('parses log-stream syslog Error line', () => {
    const line = '2026-05-27 10:08:42.123456+0300 0x1a2b3c   Error     0x0    1234  0    MyApp: boom';
    expect(parseOSLog(line)).toEqual({ level: 'E' });
  });

  it('parses log-stream syslog Fault line', () => {
    const line = '2026-05-27 10:08:42.123456+0300 0x1a2b3c   Fault     0x0    1234  0    MyApp: kaboom';
    expect(parseOSLog(line)).toEqual({ level: 'F' });
  });

  it('parses log-stream Default level', () => {
    const line = '2026-05-27 10:08:42.123456+0300 0x1a2b3c   Default   0x0    1234  0    MyApp: hello';
    expect(parseOSLog(line)).toEqual({ level: 'D' });
  });

  it('parses log-stream Debug level', () => {
    const line = '2026-05-27 10:08:42.123456+0300 0x1a2b3c   Debug     0x0    1234  0    MyApp: trace';
    expect(parseOSLog(line)).toEqual({ level: 'V' });
  });

  it('parses log show compact table format', () => {
    const line = '2026-05-27 10:08:42.123456+0300  Error  com.appsflyer.sdk: failure';
    expect(parseOSLog(line)).toEqual({ level: 'E' });
  });

  it('parses negative timezone offset', () => {
    const line = '2026-05-27 10:08:42.123456-0500 0x1a2b3c   Error     0x0    1234  0    MyApp: boom';
    expect(parseOSLog(line)).toEqual({ level: 'E' });
  });

  it('parses Info level', () => {
    const line = '2026-05-27 10:08:42.123456+0300 0x1a2b3c   Info      0x0    1234  0    MyApp: hi';
    expect(parseOSLog(line)).toEqual({ level: 'I' });
  });

  it('parses Notice level as Default-equivalent', () => {
    const line = '2026-05-27 10:08:42.123456+0300 0x1a2b3c   Notice    0x0    1234  0    MyApp: note';
    expect(parseOSLog(line)).toEqual({ level: 'D' });
  });

  it('returns null for malformed near-miss timestamp', () => {
    const line = '2026/05/27 10:08:42.123456+0300 0x1a2b3c   Error     0x0    1234  0    MyApp: nope';
    expect(parseOSLog(line)).toBeNull();
  });

  it('returns null for Xcode-console-style NSLog line without level', () => {
    const line = '2026-05-27 10:08:42.123 MyApp[1234:567890] hello from NSLog';
    expect(parseOSLog(line)).toBeNull();
  });

  it('returns null for logcat threadtime line', () => {
    const line = '05-27 10:08:42.123  1234  5678 E MyTag: boom';
    expect(parseOSLog(line)).toBeNull();
  });

  it('returns null for plain prose', () => {
    expect(parseOSLog('hello world')).toBeNull();
  });
});
