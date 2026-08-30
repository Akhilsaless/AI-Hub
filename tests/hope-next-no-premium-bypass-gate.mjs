import fs from 'node:fs';import assert from 'node:assert/strict';
const gateway=fs.readFileSync('functions/lib/hope-gateway.js','utf8');
const router=fs.readFileSync('functions/lib/router-execute.js','utf8');
assert.doesNotMatch(gateway,/executeOpenAIPrimary/,'HOPE gateway must not bypass entitlement checks through legacy OpenAI primary');
assert.match(gateway,/executeZeroCost/,'zero-cost migration bridge should remain available');
assert.match(gateway,/premiumBypass:false/,'migration bridge must explicitly remain non-premium');
assert.match(router,/export async function executeOpenAIPrimary/,'legacy helper may remain for other owner-only tooling but must not be called by HOPE gateway');
console.log('HOPE NEXT no-premium-bypass gate passed');
