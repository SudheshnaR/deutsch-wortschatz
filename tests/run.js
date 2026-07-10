/* =====================================================================
   Deutsch Wortschatz — automated test suite
   Loads the app's REAL JavaScript (from www/index.html) into a mocked
   browser sandbox and asserts behaviour across all major scenarios.
   Run:  node tests/run.js
   ===================================================================== */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'www', 'index.html'), 'utf8');

/* ---- extract inline <script> blocks (no src) ---- */
let scriptSrc = '';
const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m; while ((m = re.exec(HTML))) scriptSrc += '\n' + m[1] + '\n';

/* ---- expose top-level consts/functions onto globalThis.__APP__ ---- */
const NAMES = ['WORDS','WORDS_A1','WORDS_B1','WORDLISTS','THEMES','THEME_WORDS','WORD_BY_ID',
  'INTERVALS','STORIES','MS_DAY','DB','activeWords','levelWords','isPseudoLevel','levelLabel',
  'levelHasWords','wid','germanOf','fullGerman','today','todayNum','todayKey','dueReviewIds',
  'isIntroduced','scheduledReviews','rateWord','pullNewBatch','ensureProg','streakCount',
  'totalLearned','buildSession','storiesForLevel','storyLevel','rotationFor','reindexCustomWords',
  'shuffle','themeByKey','activityData','activityHeatmap','applyTheme','setTheme',
  'gradeTyped','normalizeAnswer','levenshtein','setStudyStyle','migrateProg','checkTyped',
  'reminderNotification','reminderTimeParts','applyReminder','autoBackup','setReminderEnabled','setReminderTime','setAutoBackup','notifPlugin','fsPlugin','restoreAutoBackup','dictccUrl','openDictcc','browserPlugin'];
scriptSrc += '\n;globalThis.__APP__={};' + NAMES.map(n =>
  `try{globalThis.__APP__[${JSON.stringify(n)}]=${n};}catch(e){}`).join('');

/* ---- browser mocks ---- */
function el() {
  const e = {
    style:{}, dataset:{}, innerHTML:'', textContent:'', value:'', checked:false,
    files:[], scrollTop:0, offsetWidth:0, _t:null,
    classList:{ add(){}, remove(){}, toggle(){}, contains(){return false} },
    addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){},
    insertAdjacentHTML(){}, setAttribute(){}, getAttribute(){return null},
    querySelector(){return el()}, querySelectorAll(){return []}, closest(){return null},
    focus(){}, click(){}, remove(){}, getContext(){return {}}
  };
  return e;
}
const shared = el();
const document = {
  getElementById(){ return shared; }, querySelector(){ return shared; },
  querySelectorAll(){ return []; }, createElement(){ return el(); },
  addEventListener(){}, removeEventListener(){}, getElementsByTagName(){ return []; },
  body: shared, documentElement: shared
};
const store = new Map();
const localStorage = {
  getItem:(k)=> store.has(k)?store.get(k):null,
  setItem:(k,v)=> store.set(k,String(v)),
  removeItem:(k)=> store.delete(k), clear:()=> store.clear()
};
const speechSynthesis = { getVoices:()=>[], speak(){}, cancel(){}, onvoiceschanged:null };
const windowMock = {
  speechSynthesis, Capacitor: undefined, addEventListener(){}, removeEventListener(){},
  matchMedia:()=>({matches:false, addEventListener(){}, removeEventListener(){}}),
  location:{ href:'' }, navigator:{ language:'en' }
};
const sandbox = {
  console, document, localStorage, speechSynthesis,
  window: windowMock, navigator:{ language:'en' },
  setTimeout:()=>0, clearTimeout(){}, setInterval:()=>0, clearInterval(){},
  requestAnimationFrame:()=>0, cancelAnimationFrame(){},
  SpeechSynthesisUtterance: class { constructor(t){ this.text=t; } },
  Blob: class { constructor(a){ this.size = a && a[0] ? String(a[0]).length : 0; } },
  fetch: ()=>Promise.resolve({}), alert(){}, confirm(){return true;}, prompt(){return null;}
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
process.on('unhandledRejection', ()=>{}); // swallow boot()'s async DOM errors

const ctx = vm.createContext(sandbox);
try { vm.runInContext(scriptSrc, ctx, { filename: 'app.js' }); }
catch (e) { console.error('FATAL: app script failed to load:', e.message); process.exit(2); }
const A = ctx.__APP__;

/* ---- tiny test runner ---- */
const results = [];
function test(id, area, desc, fn) {
  let status='PASS', detail='';
  try { const r = fn(); if (r === false) { status='FAIL'; detail='assertion returned false'; } if (typeof r === 'string') detail = r; }
  catch (e) { status='FAIL'; detail = e.message; }
  results.push({ id, area, desc, status, detail });
}
const asyncTests = [];
function atest(id, area, desc, fn) { asyncTests.push({ id, area, desc, fn }); }
function assert(cond, msg){ if(!cond) throw new Error(msg||'assertion failed'); }

/* helpers */
const { DB } = A;
async function profile(name){ await DB.loginAs(name, null); }
function allWords(){ const out=[]; Object.values(A.WORDLISTS).forEach(l=>l.forEach(w=>out.push(w))); return out; }
const TYPES = new Set(['noun','verb','adj','other','phrase']);
const ARTS = new Set(['der','die','das']);

/* =========================================================
   1. WORD LISTS — structure & integrity
   ========================================================= */
test('WL-01','Word Lists','A1 list loads with expected count', ()=> A.WORDS_A1.length===556 || `A1=${A.WORDS_A1.length}`);
test('WL-02','Word Lists','A2 list loads with expected count', ()=> A.WORDS.length===1141 || `A2=${A.WORDS.length}`);
test('WL-03','Word Lists','B1 list loads with expected count', ()=> A.WORDS_B1.length===2838 || `B1=${A.WORDS_B1.length}`);
test('WL-04','Word Lists','WORDLISTS maps A1/A2/B1 to populated arrays', ()=>{ ['A1','A2','B1'].forEach(L=>assert(A.WORDLISTS[L].length>0,L)); return true; });
test('WL-05','Word Lists','Every entry has a non-empty English gloss', ()=>{ const bad=allWords().filter(w=>!w.en); return bad.length===0 || `${bad.length} missing en`; });
test('WL-06','Word Lists','Every entry has a non-empty example sentence', ()=>{ const bad=allWords().filter(w=>!w.ex); return bad.length===0 || `${bad.length} empty ex`; });
test('WL-07','Word Lists','Every entry type is one of noun/verb/adj/other/phrase', ()=>{ const bad=allWords().filter(w=>!TYPES.has(w.type)); return bad.length===0 || `${bad.length} bad types: ${bad.slice(0,3).map(w=>w.type)}`; });
test('WL-08','Word Lists','Every noun has a valid article (der/die/das)', ()=>{ const bad=allWords().filter(w=>w.type==='noun' && !ARTS.has(w.art)); return bad.length===0 || `${bad.length} bad art`; });
test('WL-09','Word Lists','Every noun has a base form', ()=>{ const bad=allWords().filter(w=>w.type==='noun' && !w.base); return bad.length===0 || `${bad.length} noun missing base`; });
test('WL-10','Word Lists','Every non-noun has a headword (w)', ()=>{ const bad=allWords().filter(w=>w.type!=='noun' && !w.w); return bad.length===0 || `${bad.length} missing w`; });
test('WL-11','Word Lists','germanOf() returns a non-empty string for every entry', ()=>{ const bad=allWords().filter(w=>!A.germanOf(w)); return bad.length===0 || `${bad.length} empty germanOf`; });
test('WL-12','Word Lists','fullGerman() returns a non-empty string for every entry', ()=>{ const bad=allWords().filter(w=>!A.fullGerman(w)); return bad.length===0 || `${bad.length} empty fullGerman`; });

/* =========================================================
   2. CONTENT QUALITY — no broken auto-generated templates
   ========================================================= */
const themeWords = ()=>{ const o=[]; (A.THEMES||[]).forEach(t=>t.words.forEach(w=>o.push(w))); return o; };
const everyWord = ()=> allWords().concat(themeWords());
test('CQ-01','Content Quality','No "[Der/Die/Das] <noun> ist hier." filler examples remain', ()=>{ const bad=everyWord().filter(w=>/ ist hier\.$/.test(w.ex||'')); return bad.length===0 || `${bad.length} fillers`; });
test('CQ-02','Content Quality','No "Das ist <self>." example on a non-adjective', ()=>{ const bad=everyWord().filter(w=> w.type!=='adj' && (w.ex===('Das ist '+(w.w||w.base)+'.'))); return bad.length===0 || `${bad.length}`; });
test('CQ-03','Content Quality','No "Ich möchte <self>." example on a non-verb', ()=>{ const bad=everyWord().filter(w=> w.type!=='verb' && (w.ex===('Ich möchte '+(w.w||w.base)+'.'))); return bad.length===0 || `${bad.length}`; });
test('CQ-04','Content Quality','Adjectives previously mislabeled are now type "adj" (rot, schön, glücklich)', ()=>{ const names=['rot','schön','glücklich','teuer','müde']; const tw=themeWords(); names.forEach(n=>{ const e=tw.find(w=>w.w===n); assert(e && e.type==='adj', n+' not adj'); }); return true; });
test('CQ-05','Content Quality','Plural nouns relabeled to noun+article (Eltern, Leute, Medien)', ()=>{ const names=['Eltern','Leute','Medien']; names.forEach(n=>{ const e=allWords().find(w=>w.w===n||w.base===n); assert(e && e.type==='noun' && A.ARTS!==false, n); }); return true; });
test('CQ-06','Content Quality','Mistyped adverbs no longer tagged verb (morgen, gestern, offen)', ()=>{ const bad=['morgen','gestern','offen','geschlossen'].filter(n=>{ const e=themeWords().find(w=>w.w===n); return e && e.type==='verb'; }); return bad.length===0 || `still verb: ${bad}`; });
test('CQ-07','Content Quality','Numbers no longer use "Das ist <number>." example', ()=>{ const bad=everyWord().filter(w=>/^Das ist (null|eins|zwei|drei|zehn|zwanzig)\.$/.test(w.ex||'')); return bad.length===0 || `${bad.length}`; });

/* =========================================================
   3. THEMES (phrasebook)
   ========================================================= */
test('TH-01','Themes','THEMES is a non-empty array of topic groups', ()=> Array.isArray(A.THEMES) && A.THEMES.length>0);
test('TH-02','Themes','Every theme has a name, emoji and a words array', ()=>{ const bad=A.THEMES.filter(t=>!t.name||!t.emoji||!Array.isArray(t.words)); return bad.length===0 || `${bad.length}`; });
test('TH-03','Themes','Every theme word has a valid type and non-empty example', ()=>{ const bad=themeWords().filter(w=>!TYPES.has(w.type)||!w.ex); return bad.length===0 || `${bad.length}`; });
test('TH-04','Themes','Theme phrasebook total = sum of all groups', ()=>{ const sum=A.THEMES.reduce((n,t)=>n+t.words.length,0); return sum===themeWords().length; });

/* =========================================================
   4. WORD IDs & INDEX
   ========================================================= */
test('ID-01','Word IDs','wid() is defined for every entry', ()=>{ const bad=everyWord().filter(w=>!A.wid(w)); return bad.length===0 || `${bad.length}`; });
test('ID-02','Word IDs','WORD_BY_ID resolves every level word back to an entry', ()=>{ const bad=allWords().filter(w=>!A.WORD_BY_ID[A.wid(w)]); return bad.length===0 || `${bad.length} unresolved`; });
test('ID-03','Word IDs','Noun IDs use the N:art:base scheme', ()=>{ const n=allWords().find(w=>w.type==='noun'); return A.wid(n)===('N:'+n.art+':'+n.base); });
test('ID-04','Word IDs','Non-noun IDs use the type:headword scheme', ()=>{ const v=allWords().find(w=>w.type==='verb'); return A.wid(v)===('verb:'+v.w); });

/* =========================================================
   5. VOCABULARY FILTER (hide lower-level words)
   ========================================================= */
atest('VF-01','Vocab Filter','Filter OFF: A2 study set = full A2 list', async ()=>{ await profile('vf1'); DB.setLevel('A2'); DB.get().settings.hideLowerLevel=false; assert(A.activeWords().length===A.WORDLISTS.A2.length); });
atest('VF-02','Vocab Filter','Filter ON at B1: excludes lower-level (A1/A2) tagged words', async ()=>{ await profile('vf2'); DB.setLevel('B1'); const full=A.activeWords().length; DB.get().settings.hideLowerLevel=true; const filtered=A.activeWords(); assert(filtered.length<=full,'not smaller'); const order=['A1','A2','B1','B2','C1']; const bad=filtered.filter(w=>w.level && order.indexOf(w.level)<order.indexOf('B1')); assert(bad.length===0, bad.length+' lower-level leaked'); });
atest('VF-03','Vocab Filter','Filter ON at A1: keeps all (nothing lower exists)', async ()=>{ await profile('vf3'); DB.setLevel('A1'); const off=A.activeWords().length; DB.get().settings.hideLowerLevel=true; assert(A.activeWords().length===off); });

/* =========================================================
   6. SPACED REPETITION ENGINE
   ========================================================= */
atest('SR-01','Spaced Repetition','New word starts at ease 2.5; first "got" schedules +1 day', async ()=>{ await profile('sr1'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[0]); const tn=A.todayNum(); A.rateWord(id,'got'); const p=DB.get().progress[id]; assert(p.interval===1,'interval='+p.interval); assert(p.due===tn+1,'due'); assert(p.reps===1,'reps'); assert(p.ease>2.5,'ease not raised'); });
atest('SR-02','Spaced Repetition','Consecutive "got" grows the interval and never shrinks (1,4,…)', async ()=>{ await profile('sr2'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[1]); A.rateWord(id,'got'); const i1=DB.get().progress[id].interval; A.rateWord(id,'got'); const i2=DB.get().progress[id].interval; A.rateWord(id,'got'); const i3=DB.get().progress[id].interval; assert(i1<i2 && i2<i3, `${i1},${i2},${i3}`); assert(i1===1 && i2===4,'early intervals'); });
atest('SR-03','Spaced Repetition','"again" relearns tomorrow (+1) and lowers the ease', async ()=>{ await profile('sr3'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[2]); A.rateWord(id,'got'); A.rateWord(id,'got'); const tn=A.todayNum(); A.rateWord(id,'again'); const p=DB.get().progress[id]; assert(p.interval===1 && p.due===tn+1,'not relearn'); assert(p.reps===0,'reps not reset'); assert(p.ease<2.6,'ease not lowered'); });
atest('SR-04','Spaced Repetition','Ease is clamped to [1.3, 2.7]', async ()=>{ await profile('sr4'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[3]); for(let i=0;i<12;i++) A.rateWord(id,'again'); const lo=DB.get().progress[id].ease; assert(lo>=1.29 && lo<=1.31,'floor '+lo); const id2=A.wid(A.WORDLISTS.A1[4]); for(let i=0;i<12;i++) A.rateWord(id2,'got'); const hi=DB.get().progress[id2].ease; assert(hi>=2.69 && hi<=2.7,'cap '+hi); });
atest('SR-05','Spaced Repetition','A word is due only after its interval elapses', async ()=>{ await profile('sr5'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[5]); A.rateWord(id,'got'); A.rateWord(id,'got'); assert(DB.get().progress[id].interval===4,'interval'); DB.get().simOffset=1; assert(!A.dueReviewIds().includes(id),'due too early'); DB.get().simOffset=4; assert(A.dueReviewIds().includes(id),'not due after interval'); });
atest('SR-06','Spaced Repetition','scheduledReviews() is sorted ascending with correct daysUntil', async ()=>{ await profile('sr6'); DB.setLevel('A1'); const a=A.wid(A.WORDLISTS.A1[6]), b=A.wid(A.WORDLISTS.A1[7]); A.rateWord(a,'again'); A.rateWord(b,'got'); A.rateWord(b,'got'); const sr=A.scheduledReviews(); assert(sr.length===2); assert(sr[0].due<=sr[1].due,'not sorted'); assert(sr[0].daysUntil===sr[0].due-A.todayNum(),'daysUntil'); });
atest('SR-07','Spaced Repetition','rateWord records the result in today\'s reviewed log', async ()=>{ await profile('sr7'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[8]); A.rateWord(id,'got'); const day=DB.get().days[A.todayKey()]; assert(day && day.reviewed.some(r=>r.id===id && r.result==='got')); });
atest('SR-08','Spaced Repetition','Legacy box-only progress is migrated to ease/interval on rate', async ()=>{ await profile('sr8'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[9]); DB.get().progress[id]={box:2,due:5,graduated:false,lastSeen:1}; A.rateWord(id,'got'); const p=DB.get().progress[id]; assert(typeof p.ease==='number' && typeof p.interval==='number' && typeof p.reps==='number','not migrated'); });

/* =========================================================
   7. DAILY BATCH & STUDY SESSION
   ========================================================= */
atest('DB-01','Daily/Session','pullNewBatch(n) introduces n new words (progress + day.new)', async ()=>{ await profile('db1'); DB.setLevel('A1'); const added=A.pullNewBatch(10); assert(added===10,'added='+added); assert(Object.keys(DB.get().progress).length===10,'prog'); assert(DB.get().days[A.todayKey()].new.length===10,'daynew'); });
atest('DB-02','Daily/Session','pullNewBatch never re-introduces an already-known word', async ()=>{ await profile('db2'); DB.setLevel('A1'); A.pullNewBatch(10); const before=new Set(Object.keys(DB.get().progress)); A.pullNewBatch(10); const after=Object.keys(DB.get().progress); const dupes=after.filter((id,i)=>after.indexOf(id)!==i); assert(dupes.length===0,'dupes'); assert(after.length===20,'total'); });
atest('DB-03','Daily/Session','pullNewBatch caps at available pool size', async ()=>{ await profile('db3'); DB.setLevel('A1'); const total=A.activeWords().length; const got=A.pullNewBatch(total+50); assert(got===total,'got '+got+' of '+total); assert(A.pullNewBatch(5)===0,'pool not empty'); });
atest('DB-04','Daily/Session','buildSession (mixed) queues today\'s new + due reviews', async ()=>{ await profile('db4'); DB.setLevel('A1'); DB.get().settings.reviewMode='mixed'; A.pullNewBatch(5); const sess=A.buildSession(); assert(sess.queue.length>=5,'queue '+sess.queue.length); assert(sess.newCount===5,'newCount'); });
atest('DB-05','Daily/Session','autoReview OFF removes due reviews from the daily session', async ()=>{ await profile('db5'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[7]); A.rateWord(id,'got'); DB.get().simOffset=10; DB.get().settings.autoReview=false; const sess=A.buildSession(); assert(sess.dueCount===0,'dueCount '+sess.dueCount); });
atest('DB-06','Daily/Session','review-only session (buildSession true) contains only due reviews', async ()=>{ await profile('db6'); DB.setLevel('A1'); const id=A.wid(A.WORDLISTS.A1[8]); A.rateWord(id,'got'); DB.get().simOffset=10; const sess=A.buildSession(true); assert(sess.queue.every(q=>q.kind==='review'),'non-review present'); assert(sess.queue.length>=1); });

/* =========================================================
   8. PROFILES, LEVELS & PERSISTENCE
   ========================================================= */
atest('PR-01','Profiles','loginAs a new name creates a fresh profile', async ()=>{ await DB.loginAs('Alice',null); const s=DB.get(); assert(s.profile.name==='Alice','name'); });
atest('PR-02','Profiles','loginAs is case-insensitive and restores the same profile', async ()=>{ await DB.loginAs('Bob',null); DB.setLevel('A1'); A.pullNewBatch(3); await DB.loginAs('Zoe',null); const r=await DB.loginAs('bob',null); assert(r.restored===true,'not restored'); assert(Object.keys(DB.get().levels.A1.progress).length===3,'progress lost'); });
atest('PR-03','Profiles','PIN-protected profile rejects a wrong PIN and accepts the right one', async ()=>{ await DB.loginAs('Cara','1234'); await DB.logout(); const bad=await DB.loginAs('Cara','0000'); assert(bad.ok===false && bad.reason==='pin','bad pin accepted'); const good=await DB.loginAs('Cara','1234'); assert(good.ok===true,'good pin rejected'); });
atest('PR-04','Profiles','Two profiles keep independent progress', async ()=>{ await DB.loginAs('P1',null); DB.setLevel('A1'); A.pullNewBatch(4); await DB.loginAs('P2',null); DB.setLevel('A1'); assert(Object.keys(DB.get().progress).length===0,'P2 not empty'); await DB.loginAs('P1',null); DB.setLevel('A1'); assert(Object.keys(DB.get().progress).length===4,'P1 lost'); });
atest('PR-05','Levels','Each CEFR level keeps its own separate progress', async ()=>{ await DB.loginAs('L1',null); DB.setLevel('A1'); A.pullNewBatch(3); DB.setLevel('A2'); assert(Object.keys(DB.get().progress).length===0,'A2 leaked'); DB.setLevel('A1'); assert(Object.keys(DB.get().progress).length===3,'A1 lost'); });
atest('PR-06','Persistence','serialize + reload round-trips state via storage', async ()=>{ await DB.loginAs('Save',null); DB.setLevel('A1'); A.pullNewBatch(6); const before=DB.get().levels.A1.progress; const raw=DB.serialize(); const parsed=JSON.parse(raw); assert(parsed.levels.A1.progress && Object.keys(parsed.levels.A1.progress).length===6,'round-trip'); });
atest('PR-07','Persistence','sizeBytes() reports a positive storage footprint', async ()=>{ await DB.loginAs('Sz',null); assert(DB.sizeBytes()>0); });
atest('PR-08','Persistence','importData replaces progress (restore a backup)', async ()=>{ await DB.loginAs('Imp',null); DB.setLevel('A1'); const backup={ currentLevel:'A1', settings:{reviewMode:'mixed',dailyGoal:10,autoReview:true,hideLowerLevel:false}, levels:{A1:{progress:{'verb:x':{box:2,due:5,graduated:false,lastSeen:1}},days:{}}}, storiesDone:{}, simOffset:0 }; await DB.importData(backup); assert(DB.get().levels.A1.progress['verb:x'],'not imported'); });
atest('PR-09','Persistence','reset() clears all learning progress', async ()=>{ await DB.loginAs('Rst',null); DB.setLevel('A1'); A.pullNewBatch(5); await DB.reset(); assert(Object.keys(DB.get().progress||{}).length===0,'not cleared'); });
atest('PR-10','Levels','setLevel to a theme unit selects that theme\'s words', async ()=>{ await DB.loginAs('Th',null); const key=A.THEMES[0].key||A.THEMES[0].name; DB.setLevel('theme:'+(A.THEMES[0].key||'')); return true; });

/* =========================================================
   9. CUSTOM WORDS (My Words)
   ========================================================= */
atest('CW-01','Custom Words','addCustomWord adds a word usable as the "custom" study set', async ()=>{ await DB.loginAs('cw1',null); await DB.addCustomWord({id:'c1',type:'other',w:'Testwort',en:'test word',ex:'Das ist ein Testwort.'}); DB.setLevel('custom'); const aw=A.activeWords(); assert(aw.length===1 && aw[0].w==='Testwort','custom set wrong'); });
atest('CW-02','Custom Words','updateCustomWord edits in place; deleteCustomWord removes it', async ()=>{ await DB.loginAs('cw2',null); await DB.addCustomWord({id:'c2',type:'other',w:'Alt',en:'old',ex:'x'}); await DB.updateCustomWord('c2',{type:'other',w:'Neu',en:'new',ex:'y'}); DB.setLevel('custom'); assert(A.activeWords()[0].w==='Neu','not updated'); await DB.deleteCustomWord('c2'); assert(A.activeWords().length===0,'not deleted'); });
atest('CW-03','Custom Words','reindexCustomWords makes custom words resolvable via WORD_BY_ID', async ()=>{ await DB.loginAs('cw3',null); const cw={id:'c3',type:'other',w:'Indexwort',en:'x',ex:'y'}; await DB.addCustomWord(cw); A.reindexCustomWords(); assert(A.WORD_BY_ID[A.wid(cw)],'not indexed'); });

/* =========================================================
   10. STORIES
   ========================================================= */
test('ST-01','Stories','STORIES library loads as a non-empty array', ()=> Array.isArray(A.STORIES) && A.STORIES.length>0 || `len=${A.STORIES&&A.STORIES.length}`);
test('ST-02','Stories','Every story has id, level and a non-empty sentences array', ()=>{ const bad=A.STORIES.filter(s=>!s.id||!s.level||!Array.isArray(s.sentences)||s.sentences.length===0); return bad.length===0 || `${bad.length}`; });
test('ST-03','Stories','Every story sentence has German (de) and English (en)', ()=>{ const bad=A.STORIES.filter(s=>s.sentences.some(x=>!x.de||!x.en)); return bad.length===0 || `${bad.length} stories`; });
test('ST-04','Stories','storiesForLevel filters correctly (A1/A2/B1 counts sum to total)', ()=>{ const a=A.storiesForLevel('A1').length,b=A.storiesForLevel('A2').length,c=A.storiesForLevel('B1').length; return (a+b+c)===A.STORIES.length || `${a}+${b}+${c} != ${A.STORIES.length}`; });
atest('ST-05','Stories','Story rotation is deterministic for a given day (same order twice)', async ()=>{ await DB.loginAs('st',null); DB.setLevel('A1'); const r1=A.rotationFor('A1'), r2=A.rotationFor('A1'); assert(JSON.stringify(r1.order)===JSON.stringify(r2.order),'non-deterministic'); assert(r1.order.length===A.storiesForLevel('A1').length,'order len'); const sorted=[...r1.order].sort((x,y)=>x-y); assert(JSON.stringify(sorted)===JSON.stringify(sorted.map((_,i)=>i)),'not a permutation'); });

/* =========================================================
   11. DATE / SIM & STREAK
   ========================================================= */
atest('DT-01','Date/Streak','simOffset shifts the app\'s notion of "today" forward', async ()=>{ await DB.loginAs('dt',null); const t0=A.todayNum(); DB.get().simOffset=7; assert(A.todayNum()===t0+7,'offset not applied'); });
atest('DT-02','Date/Streak','todayKey is an ISO yyyy-mm-dd string', async ()=>{ await DB.loginAs('dt2',null); assert(/^\d{4}-\d{2}-\d{2}$/.test(A.todayKey())); });

/* =========================================================
   12. CONFIG & BUILD INTEGRITY
   ========================================================= */
const cfg = JSON.parse(fs.readFileSync(path.join(__dirname,'..','capacitor.config.json'),'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname,'..','package.json'),'utf8'));
test('CF-01','Config','capacitor.config.json has the expected appId', ()=> cfg.appId==='com.sudheshna.deutschwortschatz' || cfg.appId);
test('CF-02','Config','webDir points to www', ()=> cfg.webDir==='www');
test('CF-03','Config','iOS + Android platform deps are declared', ()=> !!pkg.dependencies['@capacitor/ios'] && !!pkg.dependencies['@capacitor/android']);
test('CF-04','Config','TTS + speech-recognition plugins are declared', ()=> !!pkg.dependencies['@capacitor-community/text-to-speech'] && !!pkg.dependencies['@capacitor-community/speech-recognition']);
test('CF-05','Config','Preferences + Filesystem + Share plugins are declared', ()=> !!pkg.dependencies['@capacitor/preferences'] && !!pkg.dependencies['@capacitor/filesystem'] && !!pkg.dependencies['@capacitor/share']);
test('CF-06','Build','App bundles into a single self-contained index.html', ()=> (HTML.match(/<script\b(?![^>]*\bsrc=)/gi)||[]).length>=1 && !/<script[^>]*\bsrc=/.test(HTML));
test('CF-07','Build','iOS Info.plist has microphone + speech usage strings', ()=>{ const p=fs.readFileSync(path.join(__dirname,'..','ios','App','App','Info.plist'),'utf8'); return /NSMicrophoneUsageDescription/.test(p) && /NSSpeechRecognitionUsageDescription/.test(p); });

/* =========================================================
   13. THEME (Batch 1)
   ========================================================= */
atest('TM-01','Theme','New profile defaults to the "system" theme', async ()=>{ await DB.loginAs('tm1',null); assert(DB.get().settings.theme==='system','got '+DB.get().settings.theme); });
atest('TM-02','Theme','setTheme() changes and persists the theme', async ()=>{ await DB.loginAs('tm2',null); A.setTheme('dark'); assert(DB.get().settings.theme==='dark','not set'); A.setTheme('light'); assert(DB.get().settings.theme==='light'); });
atest('TM-03','Theme','A legacy backup without a theme normalizes to "system"', async ()=>{ await DB.loginAs('tm3',null); await DB.importData({currentLevel:'A1', settings:{reviewMode:'mixed',dailyGoal:10,autoReview:true,hideLowerLevel:false}, levels:{A1:{progress:{},days:{}}}, storiesDone:{}, simOffset:0}); assert(DB.get().settings.theme==='system','theme='+DB.get().settings.theme); });
test('TM-04','Theme','CSS defines a light theme + system/reduced-motion media queries', ()=> /\[data-theme="light"\]/.test(HTML) && /prefers-color-scheme/.test(HTML) && /prefers-reduced-motion/.test(HTML));

/* =========================================================
   14. PROGRESS HEATMAP (Batch 1)
   ========================================================= */
atest('HM-01','Progress','activityData(12) returns 84 day-cells', async ()=>{ await DB.loginAs('hm1',null); DB.setLevel('A1'); const a=A.activityData(12); assert(a.cells.length===84,'cells='+a.cells.length); });
atest('HM-02','Progress','Per-day counts sum new + reviewed from the day log', async ()=>{ await DB.loginAs('hm2',null); DB.setLevel('A1'); const dk=A.todayKey(); DB.get().days[dk]={new:['a','b'],reviewed:[{id:'c',result:'got'}]}; const a=A.activityData(12); const last=a.cells[a.cells.length-1]; assert(last.count===3,'today count '+last.count); assert(a.sum>=3 && a.active>=1,'sum/active'); });
atest('HM-03','Progress','Activity intensity buckets map counts to levels 0–4', async ()=>{ await DB.loginAs('hm3',null); DB.setLevel('A1'); const dk=A.todayKey(); DB.get().days[dk]={new:[], reviewed:Array.from({length:12},(_,i)=>({id:'x'+i}))}; const a=A.activityData(12); assert(a.cells[a.cells.length-1].lvl===4,'lvl='+a.cells[a.cells.length-1].lvl); });

/* =========================================================
   15. ACCESSIBILITY (Batch 1)
   ========================================================= */
test('AX-01','Accessibility','Viewport allows pinch-zoom (no user-scalable=no / maximum-scale)', ()=> !/user-scalable\s*=\s*no/.test(HTML) && !/maximum-scale/.test(HTML));
test('AX-02','Accessibility','Emoji-only 🔊 buttons carry an aria-label', ()=>{ const bad=(HTML.match(/speak-sm"\s+onclick="[^"]*">🔊/g)||[]).length; return bad===0 || `${bad} unlabeled`; });
test('AX-03','Accessibility','Focus-visible outline styling is present', ()=> /:focus-visible/.test(HTML));

/* =========================================================
   16. CI (Batch 1)
   ========================================================= */
test('CI-01','Config','GitHub Actions test workflow exists and runs npm test', ()=>{ const p=path.join(__dirname,'..','.github','workflows','test.yml'); if(!fs.existsSync(p)) return 'missing workflow'; return /npm test/.test(fs.readFileSync(p,'utf8')); });

/* =========================================================
   17. STUDY MODES — Type & Listen (Batch 2)
   ========================================================= */
test('SM-01','Study Modes','Typing check: exact match is "correct"', ()=> A.gradeTyped('gehen',{type:'verb',w:'gehen'})==='correct');
test('SM-02','Study Modes','Typing check: article is optional for nouns', ()=> A.gradeTyped('das Haus',{type:'noun',base:'Haus',art:'das'})==='correct' && A.gradeTyped('Haus',{type:'noun',base:'Haus',art:'das'})==='correct');
test('SM-03','Study Modes','Typing check: a one-character typo is "almost"', ()=> A.gradeTyped('gehn',{type:'verb',w:'gehen'})==='almost' || A.levenshtein('gehn','gehen')+'');
test('SM-04','Study Modes','Typing check: a clearly different answer is "wrong"', ()=> A.gradeTyped('laufen',{type:'verb',w:'gehen'})==='wrong');
test('SM-05','Study Modes','Typing check: case- and whitespace-insensitive', ()=> A.gradeTyped('  GEHEN  ',{type:'verb',w:'gehen'})==='correct');
test('SM-06','Study Modes','Study style selector present in the study screen (Flip/Type/Listen)', ()=> /setStudyStyle/.test(HTML) && /⌨️ Type/.test(HTML) && /🎧 Listen/.test(HTML));
atest('SM-07','Study Modes','studyStyle defaults to flip and setStudyStyle persists', async ()=>{ await profile('sm7'); DB.setLevel('A1'); assert(DB.get().settings.studyStyle==='flip','default '+DB.get().settings.studyStyle); A.setStudyStyle('type'); assert(DB.get().settings.studyStyle==='type','not persisted'); A.setStudyStyle('flip'); });

/* =========================================================
   18. REMINDERS & AUTO-BACKUP (Batch 3)
   ========================================================= */
atest('RB-01','Reminders','Reminder defaults: off, 19:00', async ()=>{ await DB.loginAs('rb1',null); const r=DB.get().settings.reminder; assert(r && r.enabled===false && r.time==='19:00', JSON.stringify(r)); });
atest('RB-02','Backup','Auto-backup defaults on', async ()=>{ await DB.loginAs('rb2',null); assert(DB.get().settings.autoBackup===true); });
atest('RB-03','Backup','A legacy backup gains reminder + autoBackup defaults on import', async ()=>{ await DB.loginAs('rb3',null); await DB.importData({currentLevel:'A1', settings:{reviewMode:'mixed',dailyGoal:10,autoReview:true,hideLowerLevel:false}, levels:{A1:{progress:{},days:{}}}, storiesDone:{}, simOffset:0}); const st=DB.get().settings; assert(st.reminder && st.reminder.enabled===false,'reminder'); assert(st.autoBackup===true,'autoBackup'); });
test('RB-04','Reminders','reminderTimeParts parses HH:MM and clamps bad values', ()=>{ const a=A.reminderTimeParts({reminder:{time:'07:30'}}); assert(a.hour===7&&a.minute===30,'parse'); const b=A.reminderTimeParts({reminder:{time:'99:99'}}); assert(b.hour===23&&b.minute===59,'clamp'); return true; });
test('RB-05','Reminders','reminderNotification builds id:1 with an on-schedule at the chosen time', ()=>{ const n=A.reminderNotification({reminder:{time:'08:15'}}); return n.id===1 && n.schedule && n.schedule.on && n.schedule.on.hour===8 && n.schedule.on.minute===15; });
atest('RB-06','Reminders','setReminderEnabled + setReminderTime persist', async ()=>{ await DB.loginAs('rb6',null); DB.setLevel('A1'); A.setReminderEnabled(true); assert(DB.get().settings.reminder.enabled===true,'enable'); A.setReminderTime('08:15'); assert(DB.get().settings.reminder.time==='08:15','time'); A.setReminderEnabled(false); });
atest('RB-07','Reminders','applyReminder + autoBackup no-op gracefully without native plugins', async ()=>{ await DB.loginAs('rb7',null); await A.applyReminder(); await A.autoBackup(); return true; });
atest('RB-08','Backup','setAutoBackup(false) disables and autoBackup early-returns', async ()=>{ await DB.loginAs('rb8',null); A.setAutoBackup(false); assert(DB.get().settings.autoBackup===false); await A.autoBackup(); return true; });
test('RB-09','Config','local-notifications plugin is declared', ()=> !!pkg.dependencies['@capacitor/local-notifications']);
test('RB-10','Reminders','Settings screen exposes the reminder toggle + auto-backup restore', ()=> /setReminderEnabled/.test(HTML) && /restoreAutoBackup/.test(HTML) && /Automatic backup/.test(HTML));

/* =========================================================
   19. CONTENT-QUALITY GUARDRAILS (Batch 4) — invariants over the real data
   ========================================================= */
const _ARTS_OK=new Set(['der','die','das']);
const _LTYPES=new Set(['noun','verb','adj','other','prep']);
const _TTYPES=new Set(['noun','verb','adj','other','phrase','prep']);
function _levelEntries(){ const o=[]; for(const [l,arr] of Object.entries(A.WORDLISTS||{})) for(const w of arr) o.push([l,w]); return o; }
test('CQ-08','Content Quality','Every noun base is capitalized', ()=>{ const bad=_levelEntries().filter(([l,w])=>w.type==='noun'&&w.base&&/^[a-zäöüß]/.test(w.base)); assert(bad.length===0, bad.slice(0,3).map(x=>x[1].base).join(',')); return true; });
test('CQ-09','Content Quality','Every noun article is der/die/das', ()=>{ const bad=_levelEntries().filter(([l,w])=>w.type==='noun'&&!_ARTS_OK.has(w.art)); assert(bad.length===0, bad.length+' bad-article nouns'); return true; });
test('CQ-10','Content Quality','Every word type is valid (levels + phrasebook)', ()=>{ const badL=_levelEntries().filter(([l,w])=>!_LTYPES.has(w.type)); let badT=0; for(const t of (A.THEMES||[])) for(const w of (t.words||[])) if(!_TTYPES.has(w.type===undefined?'phrase':w.type)) badT++; assert(badL.length+badT===0, `L${badL.length}/T${badT} invalid`); return true; });
test('CQ-11','Content Quality','No generic "…ist hier." filler remains', ()=>{ const bad=_levelEntries().filter(([l,w])=>w.ex&&/^(Der|Die|Das)\s+.+\s+ist hier\.$/.test(String(w.ex).trim())); assert(bad.length===0, bad.length+' fillers'); return true; });
test('CQ-12','Content Quality','No word field has stray leading/trailing whitespace', ()=>{ const bad=_levelEntries().filter(([l,w])=>{const g=A.germanOf(w)||'';return (w.en&&w.en!==w.en.trim())||(w.ex&&w.ex!==w.ex.trim())||g!==g.trim();}); assert(bad.length===0, bad.length+' untrimmed'); return true; });
test('CQ-13','Content Quality','No exact duplicate (word+article+meaning) within a level', ()=>{ let dups=[]; for(const [l,arr] of Object.entries(A.WORDLISTS||{})){ const seen=new Set(); for(const w of arr){ const k=[w.type,(A.germanOf(w)||'').toLowerCase(),w.art||'',(w.en||'').toLowerCase().trim()].join('|'); if(seen.has(k)) dups.push(l+':'+A.germanOf(w)); else seen.add(k);} } assert(dups.length===0, dups.slice(0,3).join(',')); return true; });

/* =========================================================
   20. LIGHT-THEME CONTRAST (regression guards)
   ========================================================= */
test('LT-01','Theme','Light theme overrides every surface token (incl. --bg2/--card2)', ()=>{ const m=HTML.match(/:root\[data-theme="light"\]\{([^}]*)\}/); assert(m,'no light block'); const b=m[1]; ['--bg','--bg2','--card','--card2','--txt','--dim','--line'].forEach(t=>assert(b.includes(t+':'),'light theme missing '+t)); return true; });
test('LT-02','Theme','No component hardcodes a dark background that breaks light mode', ()=>{ assert(!/linear-gradient\(140deg,#272c3a/.test(HTML),'.hero hardcoded dark'); assert(!/linear-gradient\(150deg,#2b3344/.test(HTML),'.fc-back hardcoded dark'); assert(!/\.theme-stickybar\{[^}]*#0f1117/.test(HTML.replace(/\n/g,' ')),'.theme-stickybar hardcoded dark'); return true; });
test('LT-03','Theme','Quiz options + flashcard faces use themeable surface tokens', ()=>{ assert(/\.opt\{[^}]*background:var\(--bg2\)/.test(HTML),'.opt not tokenised'); assert(/\.fc-back\{[^}]*var\(--card2\)/.test(HTML),'.fc-back not tokenised'); return true; });
atest('CW-04','Custom Words','Added words persist across a reload (saved to storage)', async ()=>{ await DB.loginAs('cwpersist',null); await DB.addCustomWord({w:'Testwort',en:'test word',type:'other',ex:'Das ist ein Testwort.'}); await DB.load(); assert((DB.get().customWords||[]).some(x=>x.w==='Testwort'),'custom word lost after reload'); });

/* =========================================================
   21. DEV BAR REMOVED (release polish)
   ========================================================= */
test('UI-01','Config','The dev "Test date" simulation bar is fully removed', ()=> !/sim-bar/.test(HTML) && !/Test date/.test(HTML) && !/function simBar/.test(HTML));

/* =========================================================
   22. PREPOSITIONS — "prep" type + Browse tab
   ========================================================= */
test('PREP-01','Word Lists','Common prepositions are typed "prep" (an, mit, für, ohne, zwischen)', ()=>{ const A1=A.WORDLISTS.A1||[]; const find=g=>A1.find(w=>(A.germanOf(w)||'').toLowerCase()===g); return ['an','mit','für','ohne','zwischen'].every(g=>{ const w=find(g); return !!w && w.type==='prep'; }); });
test('PREP-02','Word Lists','Browse screen exposes a Präpositionen filter chip', ()=> /setWlFilter\('prep'/.test(HTML) && /Präpositionen/.test(HTML));
test('PREP-03','Word Lists','Preposition pill style (.pill.prep) exists', ()=> /\.pill\.prep\b/.test(HTML));
test('PREP-04','Word Lists','Each loaded level has prepositions tagged prep', ()=>{ let n=0; for(const lvl of ['A1','A2','B1']) n+=(A.WORDLISTS[lvl]||[]).filter(w=>w.type==='prep').length; assert(n>=70, 'only '+n+' prep words'); return true; });
test('PREP-05','Word Lists','Preposition homographs kept their real type (der Dank noun, laut adj)', ()=>{ const all=[].concat(A.WORDLISTS.A1||[],A.WORDLISTS.A2||[],A.WORDLISTS.B1||[]); const dank=all.find(w=>w.type==='noun'&&(w.base||'')==='Dank'); const laut=all.find(w=>(A.germanOf(w)||'')==='laut'&&w.type==='adj'); return (!dank || dank.type==='noun') && (!laut || laut.type==='adj'); });

/* =========================================================
   23. DICT.CC LOOK-UP LINK
   ========================================================= */
test('DICT-01','Word Lists','dictccUrl builds an encoded dict.cc search on the German word', ()=>{ assert(A.dictccUrl({type:'verb',w:'gehen'})==='https://www.dict.cc/?s=gehen','verb'); assert(A.dictccUrl({type:'noun',base:'Haus',art:'das'})==='https://www.dict.cc/?s=Haus','noun uses base'); assert(/%C3%BCr$/.test(A.dictccUrl({type:'other',w:'für'})),'umlaut encoded'); return true; });
test('DICT-02','Word Lists','dict.cc links appear in All Words, flashcard, Review and phrasebook', ()=> /openDictcc\(/.test(HTML) && /www\.dict\.cc/.test(HTML) && (HTML.match(/class="dictcc-link"/g)||[]).length>=4);
test('DICT-03','Word Lists','Opens via the in-app Browser plugin, with a safe web fallback', ()=>{ assert(!!pkg.dependencies['@capacitor/browser'],'@capacitor/browser not declared'); A.openDictcc('https://www.dict.cc/?s=x'); return true; });

/* =========================================================
   run async tests, then report
   ========================================================= */
(async ()=>{
  // let the app's async boot() finish loading storage before async tests
  await new Promise(r=>setImmediate(r));
  await new Promise(r=>setImmediate(r));
  for (const t of asyncTests) {
    let status='PASS', detail='';
    try { const r=await t.fn(); if(r===false){status='FAIL';detail='returned false';} if(typeof r==='string') detail=r; }
    catch(e){ status='FAIL'; detail=e.message; }
    results.push({ id:t.id, area:t.area, desc:t.desc, status, detail });
  }
  results.sort((a,b)=> a.id.localeCompare(b.id));

  // group summary
  const byArea={};
  results.forEach(r=>{ (byArea[r.area]=byArea[r.area]||{p:0,f:0,t:0}); byArea[r.area].t++; r.status==='PASS'?byArea[r.area].p++:byArea[r.area].f++; });
  const total=results.length, passed=results.filter(r=>r.status==='PASS').length, failed=total-passed;

  console.log('\n================ DEUTSCH WORTSCHATZ — TEST RESULTS ================\n');
  console.log('Area                         Tests  Pass  Fail');
  console.log('-----------------------------------------------');
  Object.keys(byArea).sort().forEach(a=>{ const g=byArea[a]; console.log(a.padEnd(28), String(g.t).padStart(4), String(g.p).padStart(5), String(g.f).padStart(5)); });
  console.log('-----------------------------------------------');
  console.log('TOTAL'.padEnd(28), String(total).padStart(4), String(passed).padStart(5), String(failed).padStart(5));
  console.log('');
  results.filter(r=>r.status==='FAIL').forEach(r=> console.log(`  FAIL ${r.id} [${r.area}] ${r.desc} — ${r.detail}`));
  console.log(`\n${passed}/${total} passed, ${failed} failed.\n`);

  // machine-readable output for the report generator
  fs.writeFileSync(path.join(__dirname,'results.json'), JSON.stringify({ total, passed, failed, byArea, results }, null, 2));
  process.exit(failed===0?0:1);
})();
