# Universal AI + Automation + App Builder Hub — Standalone

A single, independent AI control plane for many products. It is designed to run on Cloudflare, route requests across verified zero-cost AI sources, automate product workflows, and turn prompts into exportable web/mobile/API starter projects.

## What this release does

### Universal AI API
- OpenAI-compatible `POST /v1/chat/completions`.
- Separate hash-stored Hub key per connected product.
- Product daily quotas, provider daily caps, health cooldowns, retries and audit logs.
- Hard `ZERO_COST_MODE=true`: paid fallback is never silently used.
- Built-in adapters: OpenRouter Free, Workers AI, Gemini and Groq (the latter three require explicit **fresh** free-status confirmation and expire automatically).
- Dynamic OpenAI-compatible provider configs for legitimate global and Chinese AI sources.
- Dynamic providers route only after `verified_free=1`, `qualification_state='qualified'` and a non-stale verification timestamp.
- Generic `/models` discovery for dynamic providers; discovery alone never makes a model routable.
- Owner-managed D1 provider-host allowlist, with HTTPS/private-network protections.
- Optional strict auto-rotation only when provider terms are approved, model metadata explicitly proves zero pricing, and a live probe passes.
- Priority + benchmark-aware routing so a newly qualified latest free model can outrank built-in providers.

### Live research boundary
- Optional free-confirmed SearXNG or generic search executor.
- Research results are normalized and treated as untrusted source data.
- App-builder planning can use current sources when configured and reports unavailable research honestly when not configured.

### Automation engine
- Product-owned scheduled workflows stored in D1.
- AI workflow steps use the same zero-cost router.
- Allowlisted HTTPS actions for external APIs.
- Automation secrets must use dedicated `AUTOMATION_*` variables.
- Scheduled processing every 5 minutes; provider registry refresh on a slower cron.
- Workflow run history and failure records.

### Prompt-to-app builder
- Prompt → structured product plan.
- Plan → complete repository manifest using a free coding model.
- Natural-language change requests create new validated project versions, so generated apps can evolve instead of being one-shot outputs.
- If free AI capacity is exhausted, deterministic ₹0 fallback starters are available for web, Expo/mobile and Cloudflare Worker API targets.
- Path, size, secret-like-content and command validation.
- Version history, rollback, owner approval, GitHub export and deploy boundary.
- External isolated sandbox contract for real install/typecheck/lint/test/build.
- Bounded AI repair loop after real build diagnostics.
- Reference Docker-based sandbox runner included under `sandbox-runner/`.
- Small builder artifacts stay in D1; optional R2 stores larger generated repositories.
- Reference Cloudflare Pages preview deploy runner included under `deploy-runner/` for approved web/static projects.

### Dashboard
The Worker serves a responsive control dashboard at `/` with:
- overview / zero-cost status;
- app builder;
- connected products;
- AI source/model registry;
- scheduled workflows;
- connection instructions;
- provider-host controls, key rotation and bootstrap retirement;
- standalone setup guidance.

## Recommended runtime

- **Hub backend + dashboard:** Cloudflare Worker
- **Database:** Cloudflare D1
- **Free model pool:** legitimate configured providers + optional Workers AI
- **Source control/export:** GitHub
- **Generated-code execution:** separate isolated runner (never inside the Hub Worker)
- **Generated app hosting:** Cloudflare Pages/Workers or another deployer through the existing deployment boundary
- **Large builder artifacts:** optional private Cloudflare R2

## Start here

Read **`DEPLOY_FIRST.md`**. It contains the deployment order and exact configuration sequence. Also read **`docs/COST_SAFETY.md`** before attaching any provider account that can incur charges.

## Local validation

No live AI credentials are required for repository validation:

```bash
npm test
npm run audit
npm run smoke
npm run release:check
node sandbox-runner/smoke.mjs
node deploy-runner/smoke.mjs
```

## Non-goals / safety boundaries

- No scraping/automation of consumer chat websites as fake APIs.
- No multi-account quota evasion.
- No automatic assumption that a newly released model is free.
- No generated-code execution inside the Hub Worker.
- No browser/mobile exposure of Hub or provider secrets.
- No paid model fallback while ZERO-COST mode is on.

## Reproducibility note

Development dependencies are pinned to exact versions. This offline build environment could not reach the npm registry to generate a fresh `package-lock.json`; generate and commit the lockfile on the first internet-connected clean install.
