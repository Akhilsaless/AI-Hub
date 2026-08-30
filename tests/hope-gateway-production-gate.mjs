import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const gateway=read('functions/lib/hope-gateway.js');
const central=read('functions/lib/ai-gateway-execute.js');
const router=read('functions/lib/router-execute.js');
const chat=read('functions/api/user/hope/chat.js');
const connectors=read('functions/api/user/connectors.js');
const catalog=read('functions/lib/user-connectors.js');
const ownerUi=read('Public/models.html');
const settings=read('functions/api/providers/settings.js');

assert.match(gateway,/executeCentralGateway/,'HOPE must route through the entitlement-controlled central gateway');
assert.doesNotMatch(gateway,/executeOpenAIPrimary/,'HOPE must not bypass plan/allowance checks through legacy OpenAI primary routing');
assert.match(gateway,/executeZeroCost/,'gateway must preserve zero-cost migration fallback routing');
assert.match(gateway,/reasoning==='strong'/,'gateway must choose reasoning automatically');
assert.match(central,/authorizePremium/,'premium routing must require entitlement authorization');
assert.match(central,/paid_fallback_disabled/,'premium fallback must be server-side policy controlled');
assert.match(router,/daily_budget_usd/,'legacy owner OpenAI tooling must retain a daily budget guard');
assert.match(router,/monthly_budget_usd/,'legacy owner OpenAI tooling must retain a monthly budget guard');
assert.match(router,/provider_budget_state/,'legacy owner OpenAI tooling must reserve budget atomically');
assert.match(settings,/requireOwner/,'global provider settings must remain Owner-only');
assert.match(ownerUi,/API key · never returned to browser/,'Owner UI must keep platform API keys server-side');
assert.doesNotMatch(chat,/provider:r\.provider|model:r\.model/,'normal HOPE response construction must not hard-code provider/model exposure');
assert.match(connectors,/requireUser/,'user connector API must require authentication');
assert.match(catalog,/userConfigurable:true/,'approved free\/BYOK model providers must be user-connectable');
assert.match(catalog,/platformPremium:true/,'platform-paid premium providers must be distinguishable from user-owned routes');

console.log('PASS hope-gateway-production-gate: central entitlements, zero-cost fallback, budgets and provider isolation structurally verified');
