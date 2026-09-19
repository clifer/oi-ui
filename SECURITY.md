# Security Policy

## Supported version

The latest commit on `main` is the supported reference implementation.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting / Security Advisory flow
for this repository when it is available. If private reporting is not
available, open a minimal issue asking for a private reporting channel **without
including exploit details, credentials, or other sensitive material**.

Useful reports include:

- exposure of provider API keys or other secrets;
- authentication or demo-access bypasses;
- cross-site scripting or unsafe Markdown rendering;
- ways to bypass configured request or daily usage limits;
- unintended server-side data retention;
- dependency or supply-chain issues that affect this app.

## API keys

Provider API keys must remain server-side. Never place them in `public/`,
browser JavaScript, committed `.env` files, screenshots, issue bodies, or
exported history.

If a key is ever committed or otherwise exposed, **rotate it immediately**.
Removing it from the latest commit is not sufficient because Git history and
external caches may retain it.

## Public deployments

The included rate limits are lightweight, in-memory safeguards for a reference
deployment; they are not a substitute for an edge rate limiter, authentication,
provider billing limits, or production abuse monitoring. See
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
