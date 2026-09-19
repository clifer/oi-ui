# Open Inquiry UI

A deliberately small reference app for testing what changes when the **Open Inquiry Constitution** is added to a model's inquiry method.

The app supports three model providers:

- **GPT** through the OpenAI Responses API
- **Grok** through xAI's OpenAI-compatible Responses API
- **Gemini** through Google's GenAI API

## What it does

Choose a provider, then one question produces three calls to that same model:

1. **Baseline** — the question goes to the selected model with shared Markdown-formatting instructions.
2. **Constitution-guided** — the same question goes to the same model with the same formatting instructions plus the current Open Inquiry Constitution as inquiry-method instructions.
3. **Comparison** — the same model receives both answers and describes material differences, plausible Constitution-linked effects, tradeoffs, similarities, and what could change the comparison.

The comparison does **not** assume the Constitution-guided response is better and warns against treating one stochastic A/B pair as causal proof.

## Reference-app features

The UI is intentionally designed to make the experiment inspectable and portable:

- Current Constitution version and SHA-256 hash
- Selectable provider and model for each run, with environment-configurable model lists
- Exact provider, model, reasoning level, search state, timestamp, response IDs, and token usage when supplied by the provider
- Exact baseline, Constitution-guided, and comparison instructions
- Rendered Markdown / raw Markdown toggle for every output
- Clickable `Article N` references in the comparison that jump to the relevant Constitution article
- Example questions covering different inquiry patterns
- **Run again** for another stochastic sample
- **Export Markdown** and **Copy Markdown** for portable experiment records
- Opt-in browser-local experiment history using IndexedDB
- Reopen/delete individual saved runs, clear all local history, and export/import history as JSON
- Live canonical Constitution source with an explicitly labeled bundled fallback

## Run locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env
# add your keys to .env
npm start
```

Then open <http://localhost:3000>.

The server reads these provider keys:

```bash
OPENAI_API_KEY=...
XAI_API_KEY=...
GEMINI_API_KEY=...
```

You can configure the default model, selectable model list, and reasoning level for each provider:

```bash
OPENAI_MODEL=gpt-5.6-terra
OPENAI_MODELS=gpt-6-astra,gpt-5.6-sol,gpt-5.6-terra,gpt-5.6-luna
OPENAI_REASONING_EFFORT=medium

XAI_MODEL=grok-4.6
XAI_MODELS=grok-4.6,grok-4.5,grok-4.3
XAI_REASONING_EFFORT=medium

GEMINI_MODEL=gemini-3.8-flash
GEMINI_MODELS=gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-pro-preview,gemini-2.5-pro,gemini-2.5-flash
GEMINI_THINKING_LEVEL=medium
```

Keys stay server-side. The browser only receives whether each provider is configured, plus public model/reasoning settings.

## Browser-local history

History is **off by default**. If the user enables **Save runs in this browser**, completed experiments are stored in IndexedDB on that browser/device only.

There is no server-side history service and API keys are never stored in history records.

Saved runs can be reopened, deleted individually, cleared entirely, exported as JSON, or imported from a previous JSON history export. This is intended as the lightweight persistence layer for the reference app; a server database such as SQLite can be added later by downstream projects that need shared or durable deployment storage.

## Markdown output

Every answer pass gets the same presentation-only instruction to return clean GitHub-Flavored Markdown. This is deliberately separate from the Constitution so formatting is not confounded with the inquiry-method comparison.

Markdown is parsed with `marked` and sanitized with `DOMPurify` before insertion into the page.

## Constitution source and reproducibility

The server fetches the current Constitution from the canonical raw GitHub URL and keeps a five-minute in-memory cache. For every run it records:

- Constitution version parsed from the document heading
- SHA-256 of the exact Constitution text used
- source URL and live/snapshot state

If the live source cannot be reached, the server uses `constitution.snapshot.md` and clearly labels that state.

## Web search

The optional **Allow web search on both answer passes** control is provider-aware:

- OpenAI: Responses API `web_search`
- xAI: Responses API `web_search`
- Gemini: provider search grounding

Search is enabled symmetrically for the baseline and Constitution-guided answer passes. The comparison pass does not search the web; it compares the two resulting answers.

## Design intent

This is a reference implementation, not a leaderboard or general chat product.

The useful object is the delta between methods: what changed, what did not, what got stronger or weaker for a particular question, and what further evidence or repeat runs would be needed before drawing stronger conclusions.

The intended workflow is:

**Question → choose model → run → compare → inspect method → trace articles → export**
