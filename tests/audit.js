/* =====================================================================
   Deutsch Wortschatz — content audit
   Rule-based quality checker over the REAL app data (www/index.html).
   Separates HARD errors (must be zero) from REVIEW candidates (a curated
   shortlist for a human / native-speaker eye). Writes docs/CONTENT_AUDIT.md.
   Run:  node tests/audit.js   (npm run audit)
   Exit code: non-zero if any HARD error is present.
   ===================================================================== */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'www', 'index.html'), 'utf8');

/* ---- load the app's data into a mocked sandbox ---- */
let scriptSrc = '';
const re = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
let m; while ((m = re.exec(HTML))) scriptSrc += '\n' + m[1] + '\n';
scriptSrc += ';globalThis.__A__={WORDLISTS:typeof WORDLISTS!=="undefined"?WORDLISTS:{},'
  + 'THEMES:typeof THEMES!=="undefined"?THEMES:[],germanOf:germanOf,wid:wid};';
const shared = { style:{}, dataset:{}, innerHTML:'', classList:{add(){},remove(){},toggle(){},contains(){return false}},
  addEventListener(){}, setAttribute(){}, getAttribute(){return null}, querySelector(){return shared},
  querySelectorAll(){return []}, appendChild(){}, focus(){} };
const document = { getElementById(){return shared}, querySelector(){return shared}, querySelectorAll(){return []},
  createElement(){return shared}, addEventListener(){}, body:shared, documentElement:shared };
const store = new Map();
const localStorage = { getItem:k=>store.has(k)?store.get(k):null, setItem:(k,v)=>store.set(k,String(v)),
  removeItem:k=>store.delete(k), clear:()=>store.clear() };
const sb = { console, document, localStorage,
  speechSynthesis:{ getVoices:()=>[], speak(){}, cancel(){} },
  window:{ Capacitor:undefined, addEventListener(){}, matchMedia:()=>({matches:false, addEventListener(){}}) },
  navigator:{ language:'en' }, setTimeout:()=>0, clearTimeout(){}, setInterval:()=>0, clearInterval(){},
  SpeechSynthesisUtterance:class{}, Blob:class{constructor(){this.size=0}}, fetch:()=>Promise.resolve({}),
  alert(){}, confirm(){return true}, prompt(){return null} };
sb.globalThis = sb; sb.self = sb;
process.on('unhandledRejection', ()=>{});
vm.createContext(sb);
vm.runInContext(scriptSrc, sb, { timeout:15000 });
const A = sb.__A__;

/* ---- helpers / heuristics ---- */
const LEVEL_TYPES = new Set(['noun','verb','adj','other','prep']);
const THEME_TYPES = new Set(['noun','verb','adj','other','phrase','prep']);
const ARTS = new Set(['der','die','das']);
const fold = s => String(s||'').toLowerCase().replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss');
const SEP_PREFIXES = ['zurueck','zusammen','entgegen','vorbei','wieder','weiter','ueber','unter','durch','empor',
  'nieder','statt','hoch','fort','frei','fest','fern','teil','ab','an','auf','aus','bei','ein','mit','nach',
  'vor','zu','weg','los','her','hin','um','wahr'];
// nouns that legitimately have no (or a rarely-used) plural — not flagged as "missing plural"
const NO_PLURAL = new Set(['eltern','ferien','geschwister','leute','jeans','moebel','obst','gemuese','fleisch',
  'wasser','milch','butter','kaese','geld','musik','durst','hunger','glueck','regen','schnee','verkehr','abgase',
  'polizei','post','information','gepaeck','urlaub','sport','hilfe','liebe','angst','wetter','mathematik','biologie',
  'chemie','physik','deutsch','englisch','franzoesisch','zucker','salz','mehl','reis','kaffee','tee','saft','bier',
  'wein','honig','oel','benzin','strom','luft','sonne','mond','osten','westen','norden','sueden']);

function referenced(g, w, exFolded){
  // does the example plausibly contain the word (allowing umlaut/ablaut/separable forms)?
  const toks = fold(g).split(/\s+/).map(t=>t.replace(/[^a-z]/g,'')).filter(t=>t.length>=2);
  for(const t of toks){ const needle = t.length>=5 ? t.slice(0,4) : t; if(exFolded.includes(needle)) return true; }
  if(w.type==='verb'){
    let root = fold(g).replace(/[^a-z]/g,'');
    for(const p of SEP_PREFIXES){ if(root.startsWith(p) && root.length-p.length>=3){ root=root.slice(p.length); break; } }
    if(root.length>=3 && exFolded.includes(root.slice(0,3))) return true;   // catches split separable verbs
  }
  if(w.pl){ const pf=fold(w.pl).replace(/[^a-z]/g,''); if(pf.length>=4 && exFolded.includes(pf.slice(0,4))) return true; }
  return false;
}
function isNonSentence(ex){
  const f = ex.trim();
  if(/[,;:]$/.test(f)) return true;                 // salutations: "Sehr geehrte …,"
  if((f.match(/,/g)||[]).length >= 2) return true;  // comma lists / word families
  if(/^[(„"»]/.test(f)) return true;                // parenthetical / quoted fragment
  if(f.length < 12) return true;                    // very short fragment
  return false;
}

/* ---- run checks ---- */
const hard = { nounLower:[], artBad:[], typeBad:[], filler:[], untrimmed:[], dup:[] };
const review = { noRef:[], missPlural:[], noPunct:[] };
let levelCount=0, themeCount=0;

function scan(w, where, allowedTypes){
  const g = A.germanOf(w) || '';
  const en = w.en||'', ex = w.ex||'';
  if(!allowedTypes.has(w.type)) hard.typeBad.push(`${where}: ${g} [${w.type}]`);
  if(en!==en.trim() || ex!==ex.trim() || g!==g.trim()) hard.untrimmed.push(`${where}: ${g}`);
  if(w.type==='noun'){
    if(w.base && /^[a-zäöüß]/.test(w.base)) hard.nounLower.push(`${where}: ${w.art||'?'} ${w.base}`);
    if(!ARTS.has(w.art)) hard.artBad.push(`${where}: ${w.art||'∅'} ${w.base}`);
    if((!w.pl || !String(w.pl).trim()) && !NO_PLURAL.has(fold(w.base))) review.missPlural.push(`${w.art} ${w.base}`);
  }
  if(ex.trim()){
    const f = ex.trim();
    if(/^(Der|Die|Das)\s+.+\s+ist hier\.$/.test(f)) hard.filler.push(`${where}: ${f}`);
    if(!referenced(g, w, fold(f).replace(/[^a-z]/g,''))) review.noRef.push(`${g}  →  „${f}"`);
    if(!/[.!?…"»]$/.test(f) && !isNonSentence(f)) review.noPunct.push(`${g}  →  „${f}"`);
  }
}
for(const [lvl, arr] of Object.entries(A.WORDLISTS||{})){
  const seen = new Map();
  for(const w of arr){ levelCount++; scan(w, lvl, LEVEL_TYPES);
    // a TRUE duplicate = same type + word + article + meaning (homographs like
    // der/die Leiter differ by article/meaning and are legitimately kept)
    const k = [w.type, (A.germanOf(w)||'').toLowerCase(), (w.art||''), (w.en||'').toLowerCase().trim()].join('|');
    if(seen.has(k)) hard.dup.push(`${lvl}: ${w.art||''} ${A.germanOf(w)} — "${w.en}" [${w.type}]`); else seen.set(k,1);
  }
}
for(const t of (A.THEMES||[])){ for(const w of (t.words||[])){ themeCount++; scan(Object.assign({type:'phrase'},w), 'theme:'+t.key, THEME_TYPES); } }

const hardTotal = Object.values(hard).filter(Array.isArray).reduce((n,a)=>n+a.length,0);

/* ---- console summary ---- */
console.log('=== CONTENT AUDIT ===');
console.log(`Checked ${levelCount} level entries + ${themeCount} phrasebook words = ${levelCount+themeCount} total\n`);
console.log('HARD errors (must be zero):');
for(const [k,a] of Object.entries(hard)) if(Array.isArray(a)) console.log(`  ${a.length===0?'✓':'✗'} ${String(a.length).padStart(4)}  ${k}`);
console.log('\nREVIEW candidates (flagged, not changed — need a human/native eye):');
for(const [k,a] of Object.entries(review)) console.log(`     ${String(a.length).padStart(4)}  ${k}`);
console.log(hardTotal===0 ? '\n✅ No hard errors.' : `\n❌ ${hardTotal} hard error(s).`);

/* ---- markdown report ---- */
const md = [];
md.push('# Content Audit — Deutsch Wortschatz','',
  `_Generated by \`npm run audit\` (\`tests/audit.js\`). Checked **${levelCount}** level entries + **${themeCount}** phrasebook words = **${levelCount+themeCount}** total._`,'',
  '## Hard errors (must be zero — CI-guarded)','',
  '| Check | Count |','|---|---|');
for(const [k,a] of Object.entries(hard)) if(Array.isArray(a)) md.push(`| ${k} | ${a.length} |`);
md.push('', hardTotal===0 ? '✅ **No hard errors.**' : `❌ **${hardTotal} hard errors** — see below.`, '');
if(hardTotal>0){ md.push('### Hard-error details',''); for(const [k,a] of Object.entries(hard)) if(Array.isArray(a)&&a.length){ md.push(`**${k}**`,''); a.slice(0,50).forEach(x=>md.push('- '+x)); md.push(''); } }
md.push('## Review candidates (flagged, not changed)','',
  '_These need a human / native-speaker eye — automated fixes would risk introducing errors into already-valid German. Heuristics filter out the common false positives (separable verbs, umlaut plurals, plural-less nouns, salutations & word-lists), but a residue of valid forms may remain; treat as a shortlist, not a defect list._','',
  '| Category | Count | Meaning |','|---|---|---|',
  `| Example may not reference the word | ${review.noRef.length} | possible mismatched example sentence |`,
  `| Countable noun missing a plural | ${review.missPlural.length} | plural field could be added |`,
  `| Sentence-like example missing end punctuation | ${review.noPunct.length} | may need a full stop |`,'');
function section(title, arr, cap){ md.push(`### ${title} (${arr.length})`,''); if(!arr.length){ md.push('_none_',''); return; } arr.slice(0,cap).forEach(x=>md.push('- '+x)); if(arr.length>cap) md.push(`- …and ${arr.length-cap} more`); md.push(''); }
section('Examples that may not reference their word', review.noRef, 120);
section('Countable nouns missing a plural', review.missPlural, 120);
section('Sentence-like examples missing end punctuation', review.noPunct, 80);
fs.writeFileSync(path.join(ROOT,'docs','CONTENT_AUDIT.md'), md.join('\n')+'\n');
console.log('\n📝 Wrote docs/CONTENT_AUDIT.md');

process.exit(hardTotal===0 ? 0 : 1);
