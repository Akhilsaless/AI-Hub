import assert from 'node:assert/strict';
import fs from 'node:fs';

const hope=fs.readFileSync('Public/hope.html','utf8');
const scene=fs.readFileSync('Public/hope-live-scene.js','utf8');
const css=fs.readFileSync('Public/hope-3d.css','utf8');
const redirects=fs.readFileSync('Public/_redirects','utf8');

for(const theme of ['dragon-day','dragon-night','ai-day','ai-night']){
  assert.match(hope,new RegExp(theme),`active HOPE must expose ${theme}`);
  assert.match(css,new RegExp(theme),`theme stylesheet must art-direct ${theme}`);
}
assert.match(hope,/hope-live-scene\.js/,'active HOPE must load the live 3D scene');
assert.match(hope,/hope-3d\.css/,'active HOPE must load the theme layer');
assert.match(scene,/prefers-reduced-motion/,'live scene must respect reduced motion');
assert.match(scene,/MutationObserver\(setMode\)/,'live scene must react to theme changes');
assert.doesNotMatch(redirects,/\/hope(?:\.html)? \/hope-v3\.html/,'canonical /hope must serve the four-theme experience');

console.log('PASS live-hope-theme-gate: four distinct live themes are wired into active HOPE');
