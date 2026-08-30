# HOPE NEXT — AI Entitlements, Free-First Routing, and Premium Control

## Purpose

Extend the existing Central AI Gateway and HOPE NEXT orchestration foundation. Do not create a second provider system and do not bypass existing server-side provider credentials, gateway routing, memory, missions, approvals, agents, or audit infrastructure.

## Core policy

HOPE remains the orchestration layer. Models are execution engines underneath HOPE.

Request flow:

`User -> HOPE intent/complexity router -> AI Gateway -> entitlement/policy check -> free/bonus/BYOK route -> premium route if allowed -> agents/tools/memory -> usage ledger -> audit`

No paid provider may be called silently.

## Provider classes

Every provider/model exposed by the gateway must have one of these access classes:

- `free` — verified zero-cost or recurring free allowance available for the connected account.
- `bonus` — signup/promotional credits that can actually be consumed through the supported integration path.
- `byok` — user-owned credential/account; the user pays the provider directly.
- `premium` — platform-funded paid inference controlled by Super Admin and plan entitlements.

Do not label consumer web-app credits as usable integration credits unless the provider officially allows them through the connected API/OAuth route.

## Super Admin control

Super Admin is the policy authority for AI Brain and Video AI.

Super Admin can control:

- provider enabled/disabled state;
- model enabled/disabled state;
- provider/model access class;
- plan eligibility;
- provider priority and fallback order;
- per-user, per-workspace, and global usage caps;
- monthly platform budget;
- warning threshold;
- automatic/manual/disabled premium approval mode;
- emergency provider shutdown;
- premium cost and markup metadata;
- BYOK availability;
- free/bonus integration visibility;
- premium wallet/top-up eligibility.

Regular users cannot expose or modify platform credentials or global routing policy.

## User integrations

Users may see and connect approved free, bonus, and BYOK providers from Integrations.

Connection UI rules:

- Use `Connect` only when an official supported OAuth/account-connect flow exists.
- Use `Add API key` when API credentials are required.
- Use `Open provider` when the platform cannot consume the user's account/credits directly.
- Keep credentials encrypted and server-side.
- Never expose platform API keys client-side.

## Free-first routing

Default routing order:

1. User-connected verified free allowance.
2. User-connected bonus allowance.
3. User BYOK provider.
4. Platform free provider allocation.
5. Plan-included premium allowance, only when entitlement and approval policy allow it.
6. Premium wallet/top-up balance.
7. Stop and ask the user to switch provider, connect BYOK, buy premium usage, or request approval.

No silent paid fallback.

## OpenAI role

OpenAI is an optional premium intelligence layer, not HOPE's identity.

Use OpenAI only when enabled by Super Admin and allowed by the user's plan/allowance. The router may escalate to OpenAI for tasks such as:

- complex reasoning and planning;
- agent orchestration;
- coding and difficult debugging;
- high-value tool-use workflows;
- structured outputs requiring higher reliability;
- multimodal tasks where the configured OpenAI model materially improves quality.

Simple tasks should remain on free/bonus/BYOK routes when adequate.

## Video AI policy

Video generation follows the same entitlement system as AI Brain.

Users may connect approved free/open-source/bonus/BYOK video routes when technically supported.

For now, the only platform-funded premium video provider is:

- `Wan` / latest configured Wan premium model.

Do not add Veo, Kling, Seedance, Sora, or other paid video providers to platform-funded routing unless Super Admin later enables them.

Wan premium access is plan/allowance controlled and can use automatic, manual, or disabled approval mode.

## Subscription / allowance model

Do not market unlimited premium inference by default.

Plans should define capability and allowance, for example:

- Free: free/bonus integrations and limited platform-free usage; no platform premium allowance.
- Pro: free/bonus/BYOK plus controlled OpenAI and Wan allowance.
- Business: larger premium allowance, more agent/automation capacity, and organization controls.

Final prices should be configured only after usage metering exists and real provider costs can be observed.

## Premium wallet

Support a premium AI wallet/top-up ledger that can fund approved premium inference after the plan allowance is exhausted.

The wallet should be provider-agnostic so it can fund OpenAI, Wan, and future premium providers without redesigning billing.

## Usage transparency

Chat may show a compact execution indicator such as:

- `3 agents · Free AI · ₹0 premium`
- `4 agents · Premium reasoning`

Detailed usage must remain available in the account/admin usage dashboard:

- provider/model;
- access class;
- tokens or generated seconds;
- estimated provider cost;
- charged wallet/plan amount;
- approval source;
- request/workflow correlation ID;
- timestamp and actor.

## Backend requirements

Extend the existing provider gateway with canonical entitlement and cost services rather than adding frontend-only state.

Recommended canonical concepts:

- provider catalog;
- model catalog;
- provider connection ownership (`platform`, `user`, `workspace`);
- access class (`free`, `bonus`, `byok`, `premium`);
- plan entitlements;
- allowance ledger;
- premium wallet ledger;
- approval policy;
- routing decision log;
- usage/cost ledger.

All premium decisions must be made server-side.

## Acceptance criteria

- Existing HOPE, Academy, HYVORA, agents, memory, gateway, auth, and provider integrations remain working.
- Free-only mode never invokes premium providers.
- Paid fallback cannot occur without entitlement and approval.
- User credentials cannot modify global provider policy.
- OpenAI can be enabled as a premium reasoning/tool-use route without replacing HOPE orchestration.
- Wan is the sole platform-funded premium video provider for this phase.
- User-visible free/bonus integrations accurately reflect whether credits are actually usable through the supported connection method.
- Usage is metered and attributable before plan prices are finalized.
- All new controls are backed by real APIs/database policy and are not visual-only.
