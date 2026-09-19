# Public deployment

The repository is a reference implementation. Running it locally is simple;
hosting it on the public internet introduces a different risk: every successful
inquiry can spend money against your provider accounts.

## Minimum safeguards

Keep provider keys on the server and configure limits appropriate to your
budget. The app supports:

- an optional demo access token;
- per-client hourly run limits;
- a server-wide daily run limit;
- per-provider daily run limits;
- a maximum question length;
- a server-side switch that can disable web search.

Each inquiry normally creates **three model calls**: baseline,
Constitution-guided, and comparison. Set limits with that multiplier in mind.

These built-in counters are in memory and reset when the process restarts.
For a real public service, also configure an edge/WAF rate limiter, provider
billing alerts/limits, request logging that does not capture private question
content, and deployment-level monitoring.

## Reverse proxies

By default the app uses the direct socket address for per-client limiting. If
your deployment is behind a trusted reverse proxy and you want to use the
first `X-Forwarded-For` address, set `OI_TRUST_PROXY=1`. Do not enable this
when arbitrary clients can connect directly to the Node server and spoof that
header.

## Access token

If `OI_ACCESS_TOKEN` is set, the UI asks for a demo access code and sends it
only with inquiry requests. The code is not saved to browser history. Use a
separate low-value demo credential; do not reuse a provider API key.

## Privacy

Browser history is opt-in and local to that browser. The reference server does
not persist questions or responses. Hosting platforms, reverse proxies, and
provider APIs may have their own logging/retention behavior; review those
separately before describing a deployment as private.
