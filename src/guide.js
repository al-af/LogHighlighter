// In-app user guide. A single modal that explains every visible control.

const HTML = `
<div class="guide-backdrop" data-guide-close></div>
<div class="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="guideTitle">
  <header class="guide-header">
    <h2 id="guideTitle">Log Highlighter — quick guide</h2>
    <button class="guide-close" type="button" data-guide-close aria-label="Close">×</button>
  </header>
  <div class="guide-body">
    <section>
      <h3>Keyword groups</h3>
      <p>Type comma-separated keywords into the input and press <kbd>Add</kbd> or <kbd>Enter</kbd>.
      Each group is assigned one color from a 10-color pastel palette. Every match of any keyword
      in that group is highlighted with that color in the output.</p>
      <p>Use the small <kbd>×</kbd> on a chip to remove one keyword; the <kbd>×</kbd> on the right
      removes the whole group.</p>
    </section>
    <section>
      <h3>Filter vs Full mode</h3>
      <p><strong>Filter</strong> (default) — only lines containing at least one keyword are shown;
      runs of dropped lines are collapsed into a <code>···</code> separator.</p>
      <p><strong>Full</strong> — every line is shown; matching lines are highlighted, the rest are
      displayed as-is.</p>
    </section>
    <section>
      <h3>Presets</h3>
      <p>A preset is a named snapshot of your current groups, stored in browser
      <code>localStorage</code>. The setup persists across reloads but stays on this device.</p>
      <ul>
        <li><kbd>+ New preset</kbd> — opens an empty editor where you give the preset a name and define its keyword groups (one group per line, comma-separated keywords).</li>
        <li>Picking a preset from the dropdown <strong>applies it immediately</strong>, replacing your current groups.</li>
        <li><kbd>×</kbd> — delete the selected preset (with confirmation).</li>
        <li>Four starter presets ship by default: iOS SDK, Android SDK, React Native bridge, OkHttp. Delete the ones you don't use — they won't come back on reload.</li>
      </ul>
    </section>
    <section>
      <h3>Share</h3>
      <p><kbd>Share</kbd> copies a URL with your groups encoded in the fragment
      (<code>#s=…</code>). Send it to a teammate — they open the link and the setup loads.
      <strong>Log content is never included in the URL</strong>, only the groups and mode.</p>
      <p>If the recipient already has groups configured, a banner asks whether to <em>Use shared</em>,
      <em>Keep mine</em>, or <em>Merge</em>.</p>
    </section>
    <section>
      <h3>Embedded payloads</h3>
      <p>JSON objects and Apple <code>NSDictionary</code> blobs inside log lines are auto-detected
      and pretty-printed across multiple lines. Useful for iOS <code>po</code> / <code>NSLog</code> output
      and server-side JSON responses inlined in log messages.</p>
    </section>
    <section>
      <h3>Android logcat coloring</h3>
      <p>Lines matching standard <code>logcat</code> formats (threadtime, time, brief) get a left
      border colored by severity:</p>
      <ul class="guide-levels">
        <li><span class="lvl lvl-V">V</span> Verbose — dimmed gray</li>
        <li><span class="lvl lvl-D">D</span> Debug — blue</li>
        <li><span class="lvl lvl-I">I</span> Info — green</li>
        <li><span class="lvl lvl-W">W</span> Warning — amber tint</li>
        <li><span class="lvl lvl-E">E</span> Error — red tint</li>
        <li><span class="lvl lvl-F">F</span> Fatal — dark red, bold</li>
        <li><span class="lvl lvl-A">A</span> Assert — purple tint</li>
      </ul>
      <p>The same severity scheme applies to Apple <code>os_log</code> output: <code>Debug</code> maps to Verbose, <code>Info</code> stays Info, <code>Default</code>/<code>Notice</code> become Debug-blue, <code>Error</code> stays Error, <code>Fault</code> stays Fatal.</p>
      <p>Plain <code>NSLog</code>-style lines without an explicit level marker pass through uncolored.</p>
    </section>
    <section>
      <h3>Tips</h3>
      <ul>
        <li>Keep input under ~500 KB for smooth rendering.</li>
        <li>State auto-saves to <code>localStorage</code> — refresh-safe.</li>
        <li>Press <kbd>n</kbd> to jump to the next match in the output, <kbd>Shift</kbd>+<kbd>N</kbd> for the previous. The match count is shown next to the Output heading.</li>
        <li>Line numbers reflect the original log line, not the filtered position — handy for sharing references like "see line 4823".</li>
        <li>Click the moon / sun icon in the header to switch between light and dark themes. Your choice is remembered.</li>
        <li>iOS <code>os_log</code> / <code>log show</code> output is auto-colored by severity (Debug, Info, Default/Notice, Error, Fault) using the same scheme as Android logcat.</li>
        <li>Press <kbd>Esc</kbd> to close this guide.</li>
      </ul>
    </section>
  </div>
</div>
`;

let root = null;

function close() {
  if (!root) return;
  root.remove();
  root = null;
  document.removeEventListener('keydown', onKey);
}

function onKey(e) {
  if (e.key === 'Escape') close();
}

export function openGuide() {
  if (root) return;
  root = document.createElement('div');
  root.className = 'guide-root';
  root.innerHTML = HTML;
  root.addEventListener('click', e => {
    if (e.target.hasAttribute('data-guide-close')) close();
  });
  document.body.appendChild(root);
  document.addEventListener('keydown', onKey);
  root.querySelector('.guide-close').focus();
}
