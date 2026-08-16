import assert from 'node:assert/strict';
import initSqlJs from 'sql.js';
import {ensureD1Schema,D1_SCHEMA_VERSION,D1_BASELINE_TABLES} from '../functions/lib/d1-schema.js';
import {onRequestGet as getStatus} from '../functions/api/status.js';
import {onRequestPost as signupUser} from '../functions/api/account/signup.js';
import {onRequestGet as getMe} from '../functions/api/account/me.js';
import {onRequestPatch as updateProfile} from '../functions/api/account/profile.js';
import {onRequestPut as changePassword} from '../functions/api/account/password.js';
import {onRequestGet as getCapabilities} from '../functions/api/account/capabilities.js';
import {onRequestPost as deactivateAccount} from '../functions/api/account/deactivate.js';
import {onRequestPost as loginUser} from '../functions/api/account/login.js';
import {onRequestPost as runSetup} from '../functions/api/setup.js';

class D1Statement{
 constructor(database,sql){this.database=database;this.sql=sql;this.args=[]}
 bind(...args){this.args=args;return this}
 async run(){const statement=this.database.prepare(this.sql);try{statement.bind(this.args);while(statement.step()){}return {success:true,meta:{changes:this.database.getRowsModified()}}}finally{statement.free()}}
 async all(){const statement=this.database.prepare(this.sql),results=[];try{statement.bind(this.args);while(statement.step())results.push(statement.getAsObject());return {success:true,results}}finally{statement.free()}}
 async first(){return (await this.all()).results[0]||null}
}
class TestD1{
 constructor(database){this.database=database}
 prepare(sql){return new D1Statement(this.database,sql)}
 async batch(statements){this.database.run('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());this.database.run('COMMIT');return results}catch(error){this.database.run('ROLLBACK');throw error}}
}
const SQL=await initSqlJs(),database=new SQL.Database(),DB=new TestD1(database);
const decode=async response=>({response,data:await response.json(),cookie:(response.headers.get('set-cookie')||'').split(';')[0]});
const request=(path,{cookie,...options}={})=>{const headers=new Headers(options.headers||{});if(cookie)headers.set('cookie',cookie);return new Request(`https://example.test${path}`,{...options,headers})};

try{
 const env={DB,HUB_MASTER_KEY:'local-test-master-key',OWNER_PASSWORD:'local-test-owner'};
 await DB.prepare(`CREATE TABLE app_users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,password_hash TEXT NOT NULL,password_salt TEXT NOT NULL,plan TEXT NOT NULL DEFAULT 'free',status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`).run();
 await DB.prepare(`CREATE TABLE request_logs(id INTEGER PRIMARY KEY AUTOINCREMENT,product TEXT,provider TEXT,model TEXT,success INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
 await ensureD1Schema(env);
 const status=await getStatus({request:request('/api/status'),env}),statusData=await status.json();
 assert.equal(statusData.schemaVersion,D1_SCHEMA_VERSION);
 assert.ok(D1_BASELINE_TABLES.length>=50,'baseline must cover the existing HYVORA schema');
 const userColumns=(await DB.prepare(`PRAGMA table_info(app_users)`).all()).results.map(row=>row.name);assert.ok(userColumns.includes('session_version'));
 const logColumns=(await DB.prepare(`PRAGMA table_info(request_logs)`).all()).results.map(row=>row.name);for(const column of ['latency_ms','task_profile','error','estimated_cost_usd','input_tokens','output_tokens'])assert.ok(logColumns.includes(column),`legacy request_logs must receive ${column}`);
 const deniedSetup=await runSetup({request:request('/api/setup',{method:'POST'}),env});assert.equal(deniedSetup.status,401,'schema setup must be owner-only');
 const email='local-e2e@example.test',original='Original password 2026',replacement='Replacement password 2026';
 const signup=await decode(await signupUser({request:request('/api/account/signup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Original Name',email,password:original})}),env}));
 assert.equal(signup.response.status,201,JSON.stringify(signup.data));assert.match(signup.cookie,/^aihub_user=/);
 const profile=await decode(await updateProfile({request:request('/api/account/profile',{method:'PATCH',cookie:signup.cookie,headers:{'content-type':'application/json'},body:JSON.stringify({name:'Updated Name'})}),env}));
 assert.equal(profile.response.status,200);assert.equal(profile.data.user.name,'Updated Name');
 const password=await decode(await changePassword({request:request('/api/account/password',{method:'PUT',cookie:signup.cookie,headers:{'content-type':'application/json'},body:JSON.stringify({currentPassword:original,newPassword:replacement})}),env}));
 assert.equal(password.response.status,200,JSON.stringify(password.data));assert.equal(password.data.sessionsRevoked,true);assert.match(password.cookie,/^aihub_user=/);
 const oldSession=await decode(await getMe({request:request('/api/account/me',{cookie:signup.cookie}),env}));assert.equal(oldSession.data.authenticated,false);
 const newSession=await decode(await getMe({request:request('/api/account/me',{cookie:password.cookie}),env}));assert.equal(newSession.data.user.name,'Updated Name');
 const capabilities=await decode(await getCapabilities({request:request('/api/account/capabilities',{cookie:password.cookie}),env}));assert.equal(capabilities.data.passwordChange.status,'ready');assert.equal(capabilities.data.emailVerification.status,'complete_awaiting_owner_connection');
 const deactivate=await decode(await deactivateAccount({request:request('/api/account/deactivate',{method:'POST',cookie:password.cookie,headers:{'content-type':'application/json'},body:JSON.stringify({password:replacement,confirmation:'DEACTIVATE'})}),env}));
 assert.equal(deactivate.response.status,200);assert.equal(deactivate.data.deactivated,true);
 const loginAfterDeactivate=await decode(await loginUser({request:request('/api/account/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:replacement})}),env}));assert.equal(loginAfterDeactivate.response.status,401);
 console.log(`PASS local-pages-e2e: D1 schema v${D1_SCHEMA_VERSION} (${D1_BASELINE_TABLES.length} tables), compatibility upgrades, account lifecycle and session revocation verified`);
}finally{database.close()}
