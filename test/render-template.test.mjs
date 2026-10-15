// SPDX-License-Identifier: GPL-3.0-or-later
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderTemplate } from '../lib/render-template.mjs';

const palette = {background:'#000000',foreground:'#ffffff',accent:'#aBcDeF',mode:'light',
  color0:'#102030',cursor:'#ffffff',purple:'#aa00aa',theme_type:'light'};
const render = text => renderTemplate(text,palette,'fixture.tpl');

test('preserves plain text and replaces palette keys, aliases and ANSI slots', () => {
  assert.equal(render('before\n{{background}} {{ cursor }} {{\tpurple\t}} {{ color0 }} {{ theme_type }}\nafter'),
    'before\n#000000 #ffffff #aa00aa #102030 light\nafter');
  assert.equal(render('no expressions\n'),'no expressions\n');
});

test('supports upstream strip and RGB modifiers, with exact-key precedence', () => {
  assert.equal(render('{{ accent_strip }} {{ accent_rgb }} {{ mode_strip }}'),
    'aBcDeF 171,205,239 light');
  assert.equal(renderTemplate('{{ accent_strip }}',{...palette,accent_strip:'explicit'}),'explicit');
});

test('uses upstream mix amount semantics and endpoint clamping', () => {
  for (const [amount,color] of [
    ['0','#000000'],['0.5','#808080'],['50','#808080'],['50%','#808080'],
    ['1','#ffffff'],['1%','#030303'],['1.01','#030303'],
    ['12.5%','#202020'],['100','#ffffff'],['101%','#ffffff'],['200','#ffffff'],
  ]) assert.equal(render(`{{ mix background foreground ${amount} }}`),color,amount);
});

test('rounds channels up at half values and supports mixed-case inputs', () => {
  assert.equal(renderTemplate('{{ mix first last 50% }}',{first:'#010305',last:'#000000'}),'#010203');
  assert.equal(renderTemplate('{{ mix first last 30% }}',{first:'#aBcDeF',last:'#012345'}),'#789abc');
});

test('renders mix modifiers and whitespace', () => {
  assert.equal(render('{{ mix_strip background foreground 50% }} / {{\tmix_rgb\tbackground foreground 50%\t}}'),
    '808080 / 128,128,128');
});

test('current upstream VS Code lineHighlightBorder renders for both variants', () => {
  // omacom/omarchy 246f33a, default/themed/vscode-theme.json.tpl.
  const template = '{"editor.lineHighlightBorder":"{{ mix background foreground 30% }}"}';
  for (const [background,foreground,expected] of [
    ['#ffffff','#000000','#b3b3b3'],['#000000','#ffffff','#4d4d4d'],
  ]) assert.equal(JSON.parse(renderTemplate(template,{background,foreground}))['editor.lineHighlightBorder'],expected);
});

test('unknown keys, including inherited properties, fail with source and line', () => {
  for (const key of ['missing','color16','toString','constructor','missing_rgb']) {
    assert.throws(()=>render(`first line\n{{ ${key} }}`),/fixture\.tpl:2: Unknown template key:/);
  }
  assert.throws(()=>render('{{ mix background missing 30% }}'),/Unknown template key: missing/);
});

test('rejects non-color mix inputs and RGB modifiers', () => {
  assert.throws(()=>render('{{ mix mode foreground 30% }}'),/Expected #RRGGBB color/);
  assert.throws(()=>render('{{ mode_rgb }}'),/Expected #RRGGBB color/);
  assert.throws(()=>renderTemplate('{{ mix a b 30% }}',{a:'#000000ff',b:'#ffffff'}),/Expected #RRGGBB color/);
});

test('unsupported expressions and malformed mix amounts fail rather than leak', () => {
  for (const expression of [
    '', 'gradient_start background', 'mix background foreground',
    'mix background foreground 30% extra', 'mix #000000 foreground 30%',
    ...['-1','+1','.5','1.','1e2','NaN','Infinity','30%%'].map(x=>`mix background foreground ${x}`),
  ]) assert.throws(()=>render(`{{ ${expression} }}`),/Unsupported template expression/,expression);
  assert.throws(()=>render(`{{ mix background foreground ${'9'.repeat(400)} }}`),/Invalid mix amount/);
});

test('dangling, nested, or replacement-introduced delimiters cannot survive', () => {
  for (const text of ['{{ background','background }}','{{ {{ background }} }}']) {
    assert.throws(()=>render(text),/Unresolved or malformed template delimiter/);
  }
  assert.throws(()=>renderTemplate('{{ injected }}',{injected:'{{ background }}'}),/Unresolved or malformed template delimiter/);
});
