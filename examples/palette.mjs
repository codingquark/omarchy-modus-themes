// SPDX-License-Identifier: GPL-3.0-or-later
// A public palette specimen for screenshots. Press Enter to close it.
import {readFileSync} from 'node:fs';
const variant=process.argv[2]||'modus-operandi';
if(!['modus-operandi','modus-vivendi'].includes(variant)) throw new Error('Unknown theme');
const data=readFileSync(new URL(`../themes/${variant}/colors.toml`,import.meta.url),'utf8');
const p=Object.fromEntries([...data.matchAll(/^(\w+) = "(#[0-9a-f]{6})"/gmi)].map(m=>[m[1],m[2]]));
const rgb=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)).join(';');
const reset='\x1b[0m';
const fg=hex=>`\x1b[38;2;${rgb(hex)}m`;
const selected=(bg,text)=>`${fg(p.foreground)}\x1b[48;2;${rgb(bg)}m ${text.padEnd(27)}${reset}`;
const title=variant==='modus-vivendi'?'MODUS VIVENDI':'MODUS OPERANDI';
process.stdout.write('\x1b[2J\x1b[H\x1b[?25l');
console.log(`\n  ${title}\n  Palette specimen\n\n  ${fg(p.accent)}Readable by design.${reset}\n`);
console.log('  Clear text. Quiet surfaces.\n  Color with a purpose.\n');
console.log(`  ${fg(p.red)}Error${reset}      ${fg(p.green)}Success${reset}    ${fg(p.yellow)}Warning${reset}\n`);
console.log(`  ${fg(p.blue)}Focus${reset}      ${fg(p.magenta)}Function${reset}   ${fg(p.cyan)}Property${reset}\n`);
console.log('  '+selected(p.selection,'Text selection')+'\n');
console.log(`  ${fg(p.muted)}Original palettes by\n  Protesilaos Stavrou${reset}`);
process.stdin.resume();
process.stdin.once('data',()=>{process.stdout.write('\x1b[?25h');process.exit(0);});
