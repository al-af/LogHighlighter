# Log Highlighter

[![CI](https://github.com/AmitLevyAF/LogHighlighter/actions/workflows/ci.yml/badge.svg)](https://github.com/AmitLevyAF/LogHighlighter/actions/workflows/ci.yml)

A static, no-build browser tool for highlighting and filtering raw logs. Paste log text, define keyword groups (each gets a distinct pastel color), and the output panel highlights matches. Embedded JSON and Apple `NSDictionary` payloads inside log lines are detected and pretty-printed inline. Android `logcat` lines (threadtime, time, and brief formats) are detected and colored by severity (V/D/I/W/E/F/A), so iOS and Android logs both render usefully.

## Structure

```
.
├── index.html          # markup shell, loads ES module entry
├── styles/
│   └── app.css         # all styles
├── src/
│   ├── main.js         # entry: wires DOM listeners, kicks initial render
│   ├── state.js        # PALETTE, state, subscribe/notify pub-sub
│   ├── groups.js       # group/keyword CRUD mutators
│   ├── groupsView.js   # renders #groups panel
│   ├── payload.js      # JSON + NSDictionary detection and pretty-print
│   ├── logcat.js       # Android logcat line detection (level + tag)
│   ├── highlight.js    # HTML-escaping + overlap-free multi-group highlighter
│   ├── output.js       # renders #output panel (filter/full modes)
│   ├── storage.js      # versioned localStorage I/O
│   ├── presets.js      # named-preset CRUD
│   └── share.js        # URL hash encode/decode for shareable links
├── tests/              # vitest unit tests
└── .nojekyll           # disables Jekyll processing on GitHub Pages
```

State flows one way: mutators in `groups.js` change `state` and call `notify()`. The entry module subscribes both renderers to that signal. Hot-path listeners (textarea input, mode toggle) skip `notify()` and call only `renderOutput()` directly — typing into the log input does not re-render the keyword-groups panel.

## Run locally

ES modules require an HTTP origin — `file://` will fail in most browsers.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Tests

Unit tests cover storage, presets, and share-link encoding.

```bash
npm install
npm test
```

## Sharing setups

Click **Share** in the Keyword Groups panel to copy a URL with your current groups encoded in the fragment. Send it to a teammate — they open the link, get your setup preloaded, and paste their own logs in. The share URL never includes log content.

If the recipient already has local groups configured, a banner asks whether to use the shared setup, keep theirs, or merge.

## Releases

Releases are fully automated. The flow:

1. Open a PR against `main`.
2. The **PR version bump** workflow runs lint + test, then commits a `package.json` bump back to your PR branch as `github-actions[bot]`. Default is a patch bump. Add a label to override:
   - `minor` → minor version bump
   - `major` → major version bump
3. Merge the PR.
4. The **Release** workflow tags the merge commit `v<version>` and publishes a GitHub Release with auto-generated notes.

If `package.json` is already ahead of `main` when the PR is opened (you bumped manually), the bot skips the bump and respects your version.

The Release workflow is idempotent — pushing unrelated changes to `main` without a version bump does nothing.

## Deploy to GitHub Pages

One-time setup (run from the project root):

```bash
git init -b main
git add .
git commit -m "Initial commit"
gh repo create LogHighlighter --public --source=. --remote=origin --push
```

Then enable Pages either via the web UI (**Settings → Pages → Source: `main` / `(root)`**) or via the API:

```bash
gh api -X POST repos/:owner/LogHighlighter/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

The site will be available at `https://<user>.github.io/LogHighlighter/` within 1–2 minutes of the first enable.

### Update flow

```bash
git add . && git commit -m "msg" && git push
```

### Notes

- All asset paths are **relative** (`styles/app.css`, `./state.js`, etc.) so they resolve correctly under the `/LogHighlighter/` subpath.
- `.nojekyll` is present so GitHub Pages serves files as-is without Jekyll processing.
- No build step. The repo on `main` is exactly what's served.
