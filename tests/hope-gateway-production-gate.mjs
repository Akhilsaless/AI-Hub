import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');
const gateway=read('functions/lib/hope-gateway.js');
const router=read('functions/lib/router-execute.js');
const chat=read('functions/api/user/hope/chat.js');
const connectors=read('functions/api/user/connectors.js');
const connectorUi=read('Public/connectors.html');
const ownerUi=read('Public/models.html');
const settings=read('functions/api/providers/settings.js');

assert.match(gateway,/executeOpenAIPrimary/,'gateway must support Owner-enabled OpenAI primary routing');
assert.match(gateway,/executeZeroCost/,'gateway must preserve zero-cost/OpenRouter fallback routing');
assert.match(gateway,/reasoning==='strong'/,'gateway must choose reasoning automatically');
assert.match(router,/daily_budget_usd/,'OpenAI routing must enforce a daily budget');
assert.match(router,/monthly_budget_usd/,'OpenAI routing must enforce a monthly budget');
assert.match(router,/provider_budget_state/,'OpenAI routing must reserve budget atomically before a request');
assert.match(router,/gpt-5\.6-luna/,'fast OpenAI route must have an automatic cost-sensitive model');
assert.match(router,/gpt-5\.6-terra/,'balanced/strong OpenAI route must have an automatic production model');
assert.match(settings,/requireOwner/,'provider settings must be Owner-only');
assert.match(ownerUi,/API key · never returned to browser/,'Owner UI must accept a server-stored API key');
assert.match(ownerUi,/Set both OpenAI daily and monthly budgets/,'OpenAI cannot be enabled without budgets');
assert.doesNotMatch(chat,/provider:r\.provider|model:r\.model/,'normal HOPE responses must not expose provider/model fields');
assert.match(connectors,/Provider controls are Owner-only/,'normal connector API must reject provider controls');
assert.doesNotMatch(connectorUi,/type="password"|preferredModel|Connect OpenRouter/,'normal connector UI must not expose model controls');

console.log('PASS hope-gateway-production-gate: invisible routing, disabled OpenAI slot, budgets and fallback structurally verified');
