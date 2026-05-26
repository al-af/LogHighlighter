# Log Highlighter

A static, no-build browser tool for highlighting and filtering raw logs. Paste log text, define keyword groups (each gets a distinct pastel color), and the output panel highlights matches. Embedded JSON and Apple `NSDictionary` payloads inside log lines are detected and pretty-printed inline.

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
│   ├── highlight.js    # HTML-escaping + overlap-free multi-group highlighter
│   └── output.js       # renders #output panel (filter/full modes)
└── .nojekyll           # disables Jekyll processing on GitHub Pages
```

State flows one way: mutators in `groups.js` change `state` and call `notify()`. The entry module subscribes both renderers to that signal. Hot-path listeners (textarea input, mode toggle) skip `notify()` and call only `renderOutput()` directly — typing into the log input does not re-render the keyword-groups panel.

## Run locally

ES modules require an HTTP origin — `file://` will fail in most browsers.

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

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
