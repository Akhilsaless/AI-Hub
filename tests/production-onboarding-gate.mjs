import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hashPassword,verifyPassword} from '../functions/lib/user-auth.js';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const redirects=read('Public/_redirects');
const account=read('Public/account.html');
const login=read('Public/login.html');
const signup=read('Public/signup.html');
const status=read('functions/api/status.js');
const resilience=read('functions/api/user/hope/_middleware.js');
const rateLimit=read('functions/lib/auth-rate-limit.js');
const userLogin=read('functions/api/account/login.js');
const userSignup=read('functions/api/account/signup.js');
const ownerLogin=read('functions/api/auth/login.js');

assert.match(redirects,/\/chat\.html \/hope 301/,'legacy chat must route to the one active HOPE');
assert.doesNotMatch(redirects,/\/hope(?:\.html)? \/hope-v3\.html/,'the canonical HOPE route must not be rewritten to the retired v3 shell');
assert.match(redirects,/\/connect\.html \/connectors\.html 301/,'legacy connect links must route to the active connectors page');
assert.doesNotMatch(account,/href="\/chat\.html|href="\/connect\.html/,'My Hub must not send users to retired pages');
assert.match(account,/href="\/hope"/,'My Hub must open the active HOPE');
assert.match(account,/href="\/connectors\.html"/,'My Hub must open active connector onboarding');
for(const page of [login,signup]){
  assert.match(page,/requestedNext\.startsWith\('\/'\)&&!requestedNext\.startsWith\('\/\/'\)/,'auth redirects must reject external protocol-relative destinations');
}
assert.match(status,/if\(await isOwner\(request,env\)\)/,'internal D1 table names must be owner-only');
assert.match(resilience,/persistRecoveredReply/,'recovered HOPE replies must have a persistence path');
assert.match(resilience,/persisted/,'recovery responses must report whether persistence succeeded');
assert.match(rateLimit,/auth_rate_limits/,'authentication attempts must be persisted for abuse control');
assert.match(rateLimit,/CF-Connecting-IP/,'authentication limits must distinguish network actors');
for(const endpoint of [userLogin,userSignup,ownerLogin]){
  assert.match(endpoint,/authRateStatus/,'each authentication entry point must enforce rate limits');
  assert.match(endpoint,/requireJsonRequest/,'each authentication entry point must require JSON');
}
assert.match(userLogin,/password\.length>256/,'login must bound PBKDF2 input work');
assert.match(userSignup,/password\.length<12\|\|password\.length>256/,'signup must enforce a production password length range');

const password='Correct horse battery staple 2026';
const stored=await hashPassword(password);
assert.equal(await verifyPassword(password,stored.salt,stored.hash),true,'valid password must verify');
assert.equal(await verifyPassword('wrong password',stored.salt,stored.hash),false,'invalid password must fail');

console.log('PASS production-onboarding-gate: one-HOPE routing, safe onboarding redirects, recovery persistence and password verification checked');
