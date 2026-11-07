import { writeFileSync } from 'node:fs';
import { packs } from '../src/content';

/** Writes public/voicelab.html: a page for trying several spellings of each Hebrew sound. */
const QAMATS = 'ָ';
const PATACH = 'ַ';
const he = packs.he;

interface Variant {
  label: string;
  text: string;
}
interface Item {
  group: string;
  title: string;
  variants: Variant[];
}

const items: Item[] = [];
for (const entry of he.letters) {
  items.push({
    group: 'Letter sounds',
    title: `${entry.key} (${entry.id})`,
    variants: [
      { label: 'A', text: entry.soundSpeech },
      { label: 'B', text: entry.soundSpeech.replaceAll(QAMATS, PATACH) },
      { label: 'C', text: `${entry.soundSpeech.replaceAll(QAMATS, PATACH)}א` },
    ],
  });
}
for (const entry of he.letters) {
  items.push({
    group: 'Letter names',
    title: `${entry.key} (${entry.id})`,
    variants: [{ label: 'A', text: entry.nameSpeech }],
  });
}
for (const entry of he.words) {
  items.push({
    group: 'Words',
    title: `${entry.shown} ${entry.emoji}`,
    variants: [
      { label: 'A (niqqud)', text: entry.speech },
      { label: 'B (plain)', text: entry.slots.map((slot) => slot.text.replace('ּ', '')).join('') },
    ],
  });
}

const html = `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Voice lab</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; padding: 12px; background: #f4f7fb; color: #222; }
  h1 { font-size: 20px; margin: 4px 0 8px; }
  h2 { font-size: 16px; margin: 20px 0 6px; }
  .bar { position: sticky; top: 0; background: #f4f7fb; padding: 8px 0; z-index: 2; border-bottom: 1px solid #ccd; }
  .bar label { margin-right: 10px; font-size: 14px; }
  .item { background: #fff; border-radius: 12px; padding: 8px 10px; margin: 8px 0; box-shadow: 0 1px 3px #0002; }
  .title { font-size: 22px; direction: rtl; text-align: left; }
  .row { display: flex; align-items: center; gap: 6px; margin: 6px 0; flex-wrap: wrap; }
  .play { font-size: 20px; padding: 8px 14px; border-radius: 10px; border: 0; background: #3b82f6; color: #fff; }
  .text { font-size: 22px; direction: rtl; min-width: 90px; }
  .mark { font-size: 20px; padding: 6px 10px; border-radius: 10px; border: 2px solid #ccd; background: #fff; }
  .mark.on { border-color: #111; background: #ffe9a8; }
  .lab { font-size: 13px; color: #667; width: 70px; }
  button.big { font-size: 16px; padding: 10px 16px; border-radius: 10px; border: 0; background: #16a34a; color: #fff; }
  textarea { width: 100%; height: 90px; margin-top: 8px; }
  #voiceinfo { font-size: 13px; color: #445; }
</style>
</head>
<body>
<h1>Voice lab – Hebrew</h1>
<p>Tap ▶ and listen. Mark: ✅ clear, 🤔 not clear, ❌ wrong. When done press <b>Copy results</b> and paste them in the chat.</p>
<div class="bar">
  <label>Voice: <select id="voice"></select></label>
  <label>Speed: <input id="rate" type="range" min="0.5" max="1.1" step="0.05" value="0.7" /> <span id="ratev">0.7</span></label>
  <div id="voiceinfo"></div>
</div>
<div id="list"></div>
<p><button class="big" id="copy">Copy results</button></p>
<textarea id="out" readonly placeholder="Results appear here"></textarea>
<script>
const ITEMS = ${JSON.stringify(items)};
const LANG = ${JSON.stringify(he.speechLang)};
const marks = {};
const select = document.getElementById('voice');
const rate = document.getElementById('rate');
rate.oninput = () => (document.getElementById('ratev').textContent = rate.value);

function loadVoices() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('he'));
  select.innerHTML = '';
  voices.forEach((v, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = v.name + ' (' + v.lang + ')';
    select.appendChild(o);
  });
  document.getElementById('voiceinfo').textContent = voices.length ? '' : 'No Hebrew voice found on this phone – install one in Settings.';
  select._voices = voices;
}
loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(text) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG;
  const v = (select._voices || [])[Number(select.value)];
  if (v) u.voice = v;
  u.rate = Number(rate.value);
  u.pitch = 1.1;
  setTimeout(() => speechSynthesis.speak(u), 80);
}

const list = document.getElementById('list');
let lastGroup = '';
ITEMS.forEach((item, n) => {
  if (item.group !== lastGroup) {
    lastGroup = item.group;
    const h = document.createElement('h2');
    h.textContent = item.group;
    list.appendChild(h);
  }
  const box = document.createElement('div');
  box.className = 'item';
  box.innerHTML = '<div class="title"></div>';
  box.querySelector('.title').textContent = item.title;
  item.variants.forEach((variant) => {
    const key = item.group + '|' + item.title + '|' + variant.label;
    const row = document.createElement('div');
    row.className = 'row';
    const lab = document.createElement('span');
    lab.className = 'lab';
    lab.textContent = variant.label;
    const play = document.createElement('button');
    play.className = 'play';
    play.textContent = '▶';
    play.onclick = () => speak(variant.text);
    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = variant.text;
    row.append(lab, play, text);
    [['✅', 'good'], ['🤔', 'unclear'], ['❌', 'wrong']].forEach(([icon, value]) => {
      const b = document.createElement('button');
      b.className = 'mark';
      b.textContent = icon;
      b.onclick = () => {
        marks[key] = value;
        row.querySelectorAll('.mark').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      };
      row.appendChild(b);
    });
    box.appendChild(row);
  });
  list.appendChild(box);
});

document.getElementById('copy').onclick = () => {
  const info = (select._voices || [])[Number(select.value)];
  const lines = ['Voice: ' + (info ? info.name + ' ' + info.lang : 'none') + ', speed ' + rate.value];
  Object.keys(marks).forEach((k) => lines.push(k + ' = ' + marks[k]));
  const out = document.getElementById('out');
  out.value = lines.join('\\n');
  out.select();
  try { navigator.clipboard.writeText(out.value); } catch (e) {}
};
</script>
</body>
</html>
`;
writeFileSync('public/voicelab.html', html);
console.log(`voicelab: ${items.length} items`);
