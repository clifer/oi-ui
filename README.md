# Open Inquiry UI

A deliberately small reference app for testing what changes when the **Open Inquiry Constitution** is added to a model's instructions.

The app supports three model providers:

- **GPT** through the OpenAI Responses API
- **Grok** through xAI's OpenAI-compatible Responses API
- **Gemini** through Google's GenAI Interactions API

## What it does

Choose a provider, then one user question produces three calls to that same model:

1. **Baseline** — the question goes to the selected model as-is.
2. **Constitution-guided** — the same question goes to the same model with the current Open Inquiry Constitution supplied as inquiry-method instructions.
3. **Comparison** — the same model receives the question plus both answers and describes material differences, plausible Constitution-linked effects, tradeoffs, similarities, and what could change the comparison.

The comparison prompt does **not** assume the Constitution-guided response is better. It also warns against treating one stochastic A/B pair as causal proof.

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

You can configure the default model and reasoning level for each provider:

```bash
OPENAI_MODEL=gpt-5.6-terra
OPENAI_REASONING_EFFORT=medium

XAI_MODEL=grok-4.6
XAI_REASONING_EFFORT=medium

GEMINI_MODEL=gemini-3.8-flash
GEMINI_THINKING_LEVEL=medium
```

Keys stay server-side. The browser only receives whether each provider is configured, plus the public model/reasoning settings.

## Provider behavior

OpenAI and xAI use the Responses API. xAI is called through the official OpenAI JavaScript client with the xAI API base URL.

Gemini uses Google's official `@google/genai` SDK and the Interactions API.

The UI disables providers whose API key is missing.

## Constitution source

The server fetches the current Constitution from the canonical raw GitHub URL and keeps a five-minute in-memory cache. If the live source cannot be reached, it falls back to the bundled `constitution.snapshot.md` and labels the fallback state in the UI.

## Web search

The optional **Allow web search on both answer passes** control is provider-aware:

- OpenAI: Responses API `web_search`
- xAI: Responses API `web_search`
- Gemini: Interactions API `google_search`

Search is enabled symmetrically for the baseline and Constitution-guided answer passes. The comparison pass does not search the web; it compares the two resulting answers.

## Design intent

This is a reference implementation, not a leaderboard. The useful object is the delta between methods: what changed, what did not, what got stronger or weaker for a particular question, and what further evidence or repeat runs would be needed before drawing stronger conclusions.
