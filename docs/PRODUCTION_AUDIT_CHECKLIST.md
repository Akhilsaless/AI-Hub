# Final production audit gates

A release is not complete until every non-credential gate passes and credential-dependent gates are explicitly marked awaiting owner authorization rather than silently skipped.

## Core release
- main/deployment branch has no unexpected divergence.
- dependency audit and existing production-gates pass.
- Cloudflare project preflight and release-stamp verification pass.
- rollback target is recorded before deployment.

## Account/security
- anonymous/private route behavior checked.
- two distinct accounts cannot read/write each other's goals, Academy progress, campaigns, metrics or build missions.
- secrets never appear in public JS/HTML/API status responses.
- destructive/external actions require explicit confirmation.
- emergency provider/publishing disable state fails closed.

## HOPE
- normal general chat works for 5+ turns without being forced into a module.
- moods survive multi-turn regression without breaking replies.
- memory on/off/reset is observable and user controlled.
- goals/world-state CRUD is isolated per user.
- HOPE Daily respects proactive toggle.
- Academy/HYVORA handoff is a suggestion/confirmed transition, never a silent external mutation.
- provider failure/timeout/fallback and budget exhaustion return usable errors or fallback answers.

## Academy
- Beginner → Intermediate → Advanced progression renders.
- catalog search/category/access filters work.
- lesson story, narration fallback, real-tool link and HOPE Tutor work.
- adaptive quest/completion/remediation/retention work.
- certification remains locked until mastery/proof requirements are met.
- What's New surface labels curated vs live-source data honestly.

## Themes/accessibility
- Dragon Day, Dragon Night, AI Day, AI Night render as distinct environments.
- theme persists across HOPE, Academy and HYVORA.
- mobile widths and keyboard navigation remain usable.
- prefers-reduced-motion disables nonessential motion.

## HYVORA
- Brand Brain → campaign → draft → repurpose → approval → schedule works.
- calendar and connector readiness render.
- analytics ingestion and dashboard render.
- performance recommendation uses recorded data and does not invent results.
- live publish stays locked without OAuth/permissions/owner enable.
- with real accounts: test media upload/publish and provider analytics sync before enabling production automation.

## Plans/entitlements
- obsolete pricing is absent.
- HOPE Free/Pro and Academy/HYVORA/Build module boundaries are represented consistently.
- one 3-day premium-module trial policy is enforced server-side before charging is enabled.
- referral reward cannot be issued before qualifying paid conversion.
- payment UI cannot claim purchase success until a payment provider is connected and verified.

## Build
- build mission begins isolated.
- plan/build/test/repair/preview/version states cannot mutate production directly.
- deploy requires explicit confirmation and rollback checkpoint.
- arbitrary user code is never executed in the production worker without a sandbox provider.

## Data/infrastructure
- D1 remains source of truth until Supabase session + dual-write parity is verified.
- Supabase cutover requires RLS/isolation tests and rollback plan.
- schema creation/migrations are idempotent.
- backup/restore procedure documented and exercised before paid launch.

## Owner-required final verification
- YouTube OAuth/account + media publish + analytics permissions.
- Meta OAuth for Instagram/Facebook + page/account permissions.
- optional paid AI/video/voice provider keys.
- payment provider and webhook verification if subscriptions are activated.
- production email/domain/DNS if custom domain/email are activated.
