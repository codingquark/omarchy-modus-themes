// SPDX-License-Identifier: GPL-3.0-or-later
import {readFileSync} from 'node:fs';
const luminance=hex=>{
  if(!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('Invalid contrast color: '+hex);
  const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255)
    .map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
  return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
};
const themes=['modus-operandi','modus-vivendi'];
const triplet=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)).join(',');
let failures=0;
for(const theme of themes) {
  const pairs=JSON.parse(readFileSync(new URL(`themes/${theme}/contrast-pairs.json`,import.meta.url)));
  let minimum=Infinity,failed=0;
  for(const pair of pairs) {
    const a=luminance(pair.fg),b=luminance(pair.bg);
    const ratio=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
    if(pair.min===7) minimum=Math.min(minimum,ratio);
    if(ratio<pair.min) {console.error(`${theme} / ${pair.name}: ${ratio.toFixed(2)}:1 < ${pair.min}:1`);failed++;}
  }
  failures+=failed;
  console.log(`${theme}: ${pairs.length} pairs, ${failed} failures, minimum text contrast ${minimum.toFixed(2)}:1.`);
}
for(const theme of themes) {
  const seed=readFileSync(new URL(`themes/${theme}/chromium.theme`,import.meta.url),'utf8').trim();
  const dim=JSON.parse(readFileSync(new URL(`palettes/${theme}.json`,import.meta.url)))['bg-dim'];
  const channels=seed.split(',').map(Number);
  if(!/^\d{1,3},\d{1,3},\d{1,3}$/.test(seed)||channels.some(v=>v>255)) {
    console.error(`${theme} chromium seed: "${seed}" is not three decimal 0-255 components.`);failures++;
  } else if(seed!==triplet(dim)) {
    console.error(`${theme} chromium seed: ${seed} does not match bg-dim ${dim} (${triplet(dim)}).`);failures++;
  } else if(new Set(channels).size!==1) {
    console.error(`${theme} chromium seed: bg-dim ${dim} is tinted; a non-neutral browser seed needs review.`);failures++;
  } else console.log(`${theme}: chromium seed ${seed} matches neutral bg-dim ${dim}.`);
}
process.exitCode=failures?1:0;
