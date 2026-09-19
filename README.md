# Open Inquiry UI

A deliberately small reference app for testing what changes when the **Open Inquiry Constitution** is added to a model's instructions.

## What it does

One user question produces three model calls:

1. **Baseline** — the question goes to the model as-is.
2. **Constitution-guided** — the same question goes to the same model with the current Open Inquiry Constitution supplied as inquiry-method instructions.
3. **Comparison** — the model receives the question plus both answers and describes material differences, plausible Constitution-linked effects, tradeoffs, similarities, and what could change the comparison.

The comparison prompt does **not** assume the Constitution-guided response is better. It also warns against treating one stochastic A/B pair as causal proof.

## Run locally

Requires Node.js 20+.

```bash
npm install
export OPENAI_API_KEY="..."
npm start
```

Then open <http://localhost:3000>.

Optional environment variables:

```bash
OPENAI_MODEL=gpt-5.6-terra
OPENAI_REASONING_EFFORT=medium
PORT=3000
CONSTITUTION_URL=https://raw.githubusercontent.com/clifer/open-inquiry-constitution/main/CONSTITUTION.md
```

The API key stays server-side.

## Constitution source

The server fetches the current Constitution from the canonical raw GitHub URL and keeps a five-minute in-memory cache. If the live source cannot be reached, it falls back to the bundled `constitution.snapshot.md` and labels the fallback state in the UI.

## Web search

The UI includes an optional **Allow web search on both answer passes** control. When enabled, both the baseline and Constitution-guided answers get the same web-search capability. The comparison pass only compares the resulting text.

## Design intent

This is a reference implementation, not a leaderboard. The useful object is the delta between methods: what changed, what did not, what got stronger or weaker for a particular question, and what further evidence or repeat runs would be needed before drawing stronger conclusions.
