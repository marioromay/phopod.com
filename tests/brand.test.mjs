import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {publicFiles} from '../app.mjs';
test('all public pages use Phopod while preserving their canonical routes',async()=>{
 for(const file of publicFiles.filter(p=>p.endsWith('.html'))){
  const s=await readFile(new URL('../'+file,import.meta.url),'utf8');
  assert.ok(!/Inspector\s+Focus|INSPECTOR(?:<br>|\s)+FOCUS/.test(s),file);
  if(!s.includes('Opening the combined tool.'))assert.ok(s.includes('Phopod')||s.includes('PHOPOD'),file);
 }
});
test('new stage pages retain visible footer access to Meet Phopod on phones',async()=>{
 for(const file of ['index.html','before-the-shoot/index.html','during-the-shoot/index.html','after-the-shoot/index.html','credits/index.html']){
  const s=await readFile(new URL('../'+file,import.meta.url),'utf8'),footer=s.match(/<footer[\s\S]*?<\/footer>/)[0];
  assert.match(footer,/<a href="\/about\/">Meet Phopod ↗<\/a>/,file);
 }
});
test('existing saved shoots, themes and photo handoffs retain their storage identifiers',async()=>{
 const keys={'before.js':'inspector-focus:shoot:v1','theme.js':'inspector-focus-theme','workspace.mjs':'inspector-focus-transfer','selection-handoff.mjs':'inspector-focus-transfer'};
 for(const [file,key] of Object.entries(keys))assert.ok((await readFile(new URL('../'+file,import.meta.url),'utf8')).includes(key),file);
});

test('Phopod pages have no ShootWalk referral links',async()=>{
 for(const file of publicFiles.filter(p=>p.endsWith('.html'))){
  const s=await readFile(new URL('../'+file,import.meta.url),'utf8');
  assert.ok(!/href=["']https?:\/\/(?:www\.)?shootwalk\.com/i.test(s),file);
 }
});
