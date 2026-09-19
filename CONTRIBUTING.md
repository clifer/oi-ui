# Contributing

Thanks for helping improve the Open Inquiry reference app.

## Scope

This repository is intentionally small. Changes should make the Constitution
experiment easier to inspect, reproduce, understand, or safely deploy without
turning the app into a general-purpose chat product.

Changes to the **Open Inquiry Constitution itself** belong in
`clifer/open-inquiry-constitution`. The snapshot here is only a fallback copy.

## Local development

Requires Node.js 20 or newer.

```bash
npm ci
cp .env.example .env
# add only the provider keys you intend to use
npm start
```

Run checks before opening a pull request:

```bash
npm run check
```

## Pull requests

- Keep changes focused.
- Explain any change that could affect the baseline-vs-Constitution comparison.
- Preserve the rule that both answer passes use the same provider, model,
  reasoning settings, web-search setting, and presentation instructions.
- Do not introduce a score, winner, or required conclusion into the comparison.
- Update documentation when behavior or environment variables change.
- Never commit API keys, credentials, private prompts, or exported user history.

## Model/provider updates

Provider model catalogs change frequently. Prefer updating the environment
defaults and documentation rather than hard-coding assumptions throughout the
UI. Verify model IDs against current provider documentation before changing
defaults.

## Security

Please do not open a public issue containing an API key, exploit payload, or
other sensitive security material. See [SECURITY.md](SECURITY.md).
