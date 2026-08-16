import assert from 'node:assert/strict';
import {authRateStatus,recordAuthAttempt,clearAuthAttempts,requireJsonRequest} from '../functions/lib/auth-rate-limit.js';

class MemoryD1{
 constructor(){this.rows=new Map()}
 prepare(sql){
  const db=this;
  return {args:[],bind(...args){this.args=args;return this},async first(){const [scope,actor]=this.args;return db.rows.get(`${scope}:${actor}`)||null},async run(){
   if(sql.startsWith('CREATE TABLE'))return {success:true};
   if(sql.startsWith('DELETE FROM')){const [scope,actor]=this.args;db.rows.delete(`${scope}:${actor}`);return {success:true}}
   if(sql.startsWith('INSERT INTO')){const [scope,actor,now,updated_at,,windowSeconds,limit,,blockSeconds]=this.args,key=`${scope}:${actor}`,prior=db.rows.get(key),inWindow=prior&&now-Number(prior.window_started)<windowSeconds,attempts=inWindow?Number(prior.attempts)+1:1,window_started=inWindow?Number(prior.window_started):now,blocked_until=attempts>=limit?now+blockSeconds:0;db.rows.set(key,{window_started,attempts,blocked_until,updated_at});return {success:true}}
   throw new Error(`Unexpected test SQL: ${sql}`);
  }};
 }
}

const env={DB:new MemoryD1(),HUB_MASTER_KEY:'test-only-master-key'};
const request=new Request('https://example.test/api/account/login',{method:'POST',headers:{'content-type':'application/json; charset=utf-8','CF-Connecting-IP':'203.0.113.10'},body:'{}'});
assert.equal(requireJsonRequest(request),true);
assert.equal(requireJsonRequest(new Request('https://example.test',{method:'POST',headers:{'content-type':'text/plain'},body:'{}'})),false);

const limits={limit:2,windowSeconds:900,blockSeconds:900};
const first=await authRateStatus(request,env,'test-login',limits);
assert.equal(first.ok,true);
await recordAuthAttempt(env,'test-login',first.actor,limits);
assert.equal((await authRateStatus(request,env,'test-login',limits)).ok,true);
await recordAuthAttempt(env,'test-login',first.actor,limits);
const blocked=await authRateStatus(request,env,'test-login',limits);
assert.equal(blocked.ok,false);
assert.ok(blocked.retryAfter>0);
await clearAuthAttempts(env,'test-login',first.actor);
assert.equal((await authRateStatus(request,env,'test-login',limits)).ok,true);

console.log('PASS auth-rate-limit: JSON enforcement, D1-backed blocking and reset verified');
