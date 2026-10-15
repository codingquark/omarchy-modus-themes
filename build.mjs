// SPDX-License-Identifier: GPL-3.0-or-later
// Modus palette: Protesilaos Stavrou, Copyright (C) 2019-2026 FSF, Inc.
// Omarchy adaptation: Dhavan Vaidya, 2026. See THIRD_PARTY_NOTICES.md.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderTemplate } from './lib/render-template.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const templates = join(process.env.OMARCHY_PATH || '/usr/share/omarchy', 'default/themed');
const q = JSON.stringify;
const table = obj => Object.entries(obj).map(([k,v]) => `${k} = ${q(v)}`).join('\n') + '\n';
const section = (name,obj) => `[${name}]\n${table(obj)}\n`;
const triplet = hex => hex.slice(1).match(/../g).map(v => parseInt(v,16)).join(',');
const names = ['black','red','green','yellow','blue','magenta','cyan','white'];
const templateCache = new Map();
const variants = process.argv.slice(2);
if (variants.some(v => !['modus-operandi','modus-vivendi'].includes(v))) {
  throw new Error('Usage: node build.mjs [modus-operandi|modus-vivendi ...]');
}

for (const name of variants.length ? variants : ['modus-operandi','modus-vivendi']) {
  const dark = name === 'modus-vivendi';
  const title = dark ? 'Modus Vivendi' : 'Modus Operandi';
  const u = JSON.parse(readFileSync(join(root,'palettes',`${name}.json`),'utf8'));
  const out = join(root,'themes',name);
  mkdirSync(out,{recursive:true});
  const write = (file,text) => writeFileSync(join(out,file),text.replace(/\n+$/,'\n'));

  // Surface-specific choices are explicit. Never invert or brighten a palette.
  const s = {
    fg:u['fg-main'], bg:u['bg-main'], dim:u['bg-dim'], border:u.border,
    accent:u['accent-0'], chrome:dark ? '#bfbfbf' : '#474747',
    region:dark ? '#575757' : u['bg-region'], completion:u['bg-completion'],
    completionMatch:dark ? u['fg-main'] : u['accent-0'],
    status:u['bg-mode-line-active'], inactiveStatus:u['bg-mode-line-inactive'],
    alert:dark ? u['red-faint'] : u.red,
    search:dark ? u['bg-yellow-subtle'] : u['bg-search-current'],
    lazySearch:dark ? u['bg-cyan-subtle'] : u['bg-search-lazy'],
    paren:dark ? u['bg-cyan-subtle'] : u['bg-paren-match'],
  };
  const p = {
    mode:dark ? 'dark' : 'light', accent:s.accent, background:s.bg, foreground:s.fg,
    dark_background:s.dim, darker_background:u['bg-inactive'], lighter_background:s.dim,
    dark_foreground:s.chrome, light_foreground:u['fg-alt'], bright_foreground:s.fg,
    muted:s.chrome, selection:s.region, selection_background:s.region, selection_foreground:s.fg,
    red:u.red, green:u.green, yellow:u.yellow, blue:u.blue, magenta:u.magenta, cyan:u.cyan,
    orange:u['yellow-warmer'], brown:u['yellow-faint'],
    bright_red:u['red-warmer'], bright_green:u['green-cooler'], bright_yellow:u['yellow-warmer'],
    bright_blue:u['blue-warmer'], bright_magenta:u['magenta-cooler'], bright_cyan:u['cyan-cooler'],
    hyprland_active_border:s.accent, hyprland_inactive_border:s.border,
  };
  const ansi = names.map(n=>u[`fg-term-${n}`]).concat(names.map(n=>u[`fg-term-${n}-bright`]));
  const templateValues={...p,cursor:s.fg,purple:p.magenta,theme_type:p.mode,
    ...Object.fromEntries(ansi.map((value,index)=>[`color${index}`,value]))};
  const render = file => {
    if (!templateCache.has(file)) templateCache.set(file,readFileSync(join(templates,file+'.tpl'),'utf8'));
    return renderTemplate(templateCache.get(file),templateValues,join(templates,file+'.tpl'));
  };
  write('colors.toml',`# ${title}: Modus Themes 5.2.0, explicit semantic roles.\n`+table(p));
  if (!dark) write('light.mode','');
  write('icons.theme',dark ? 'Yaru-blue-dark\n' : 'Yaru-blue\n');
  // Neutral seed for Chromium's generated theme.
  write('chromium.theme',triplet(s.dim)+'\n');

  let shell=`# ${title}: opaque surfaces and visible keyboard focus.\n`;
  shell+=section('bar',{background:s.dim,'background-alpha':1,text:s.fg,active:s.alert,
    'scale-with-font':true,'size-horizontal':30,'size-vertical':32});
  shell+=section('hyprland',{'active-border':s.accent,'active-border-foreground':s.accent});
  shell+=section('controls',{
    'normal-color':s.fg,'normal-fill-alpha':0.02,'normal-border':s.chrome,'normal-border-width':1,'normal-border-alpha':1,
    'hover-cursor-color':s.fg,'hover-cursor-fill-alpha':0.06,'hover-cursor-border':s.accent,'hover-cursor-border-width':1,'hover-cursor-border-alpha':1,
    'focus-color':s.fg,'focus-fill-alpha':0.06,'focus-border':s.accent,'focus-border-width':2,'focus-border-alpha':1,
    'selected-color':s.fg,'selected-fill-alpha':0.14,'selected-border':s.accent,'selected-border-width':2,'selected-border-alpha':1,
    'pressed-fill-alpha':0.18,'selection-fill-alpha':0.26,
  });
  shell+=section('spacing',{scale:1,'scale-with-font':true,'popup-row-height':32,'control-height':30});
  shell+=section('font',{'base-size':12});
  for (const surface of ['popups','tooltip','notifications','launcher','menu','polkit','lock']) {
    const c={background:s.bg,'background-alpha':1,text:s.fg,
      border:['tooltip','lock'].includes(surface) ? s.chrome : s.accent,'border-alpha':1};
    if (['popups','notifications'].includes(surface)) c['border-width']=2;
    if (surface==='notifications') c.countdown=s.accent;
    if (['launcher','menu','polkit'].includes(surface)) Object.assign(c,{scrim:s.bg,'scrim-alpha':0.8});
    if (['launcher','menu'].includes(surface)) Object.assign(c,{
      'selected-background':s.completion,'selected-background-alpha':1,
      'selected-text':s.fg,'selected-border':s.accent,'selected-border-alpha':1,
    });
    if (['polkit','lock'].includes(surface)) Object.assign(c,{'text-error':u.red,'border-error':u.red});
    if (surface==='polkit') c.accent=s.accent;
    if (surface==='lock') Object.assign(c,{placeholder:s.chrome,'border-active':s.accent,selection:s.region,'selection-alpha':1});
    shell+=section(surface,c);
  }
  shell+=section('image-picker',{scrim:s.bg,'scrim-alpha':0.9,text:s.fg,
    'selected-border':s.accent,'selected-border-alpha':1,'unselected-border':s.border,'unselected-border-alpha':1});
  shell+=section('herdr',{done:u.green,working:u.yellow});
  write('shell.toml',shell);

  const rgb=hex=>`rgb(${hex.slice(1)})`;
  write('hyprland.lua',`-- SPDX-License-Identifier: GPL-3.0-or-later
-- ${title}; loaded after Omarchy defaults.
hl.config({
  general = { col = { active_border = ${q(rgb(s.accent))}, inactive_border = ${q(rgb(s.border))} } },
  decoration = { active_opacity = 1.0, inactive_opacity = 1.0, dim_inactive = false },
  group = {
    col = { border_active = ${q(rgb(s.accent))}, border_inactive = ${q(rgb(s.border))} },
    groupbar = {
      text_color = ${q(rgb(s.fg))}, text_color_inactive = ${q(rgb(s.chrome))},
      col = { active = ${q(rgb(s.completion))}, inactive = ${q(rgb(s.dim))} },
    },
  },
})
o.window({ tag = "default-opacity" }, { opacity = "1.0 override 1.0 override" })
`);

  let alacritty=section('window',{opacity:1})+section('colors.primary',{
    background:s.bg,foreground:s.fg,dim_foreground:s.chrome,bright_foreground:s.fg,
  })+section('colors.cursor',{text:s.bg,cursor:s.fg})
    +section('colors.vi_mode_cursor',{text:s.bg,cursor:s.accent})
    +section('colors.selection',{text:s.fg,background:s.region})
    +section('colors.search.matches',{foreground:s.fg,background:s.lazySearch})
    +section('colors.search.focused_match',{foreground:s.fg,background:s.search});
  alacritty+=section('colors.normal',Object.fromEntries(names.map((n,i)=>[n,ansi[i]])));
  alacritty+=section('colors.bright',Object.fromEntries(names.map((n,i)=>[n,ansi[i+8]])));
  write('alacritty.toml',alacritty);
  write('ghostty.conf',`background = ${s.bg}
foreground = ${s.fg}
background-opacity = 1
cursor-color = ${s.fg}
cursor-text = ${s.bg}
selection-background = ${s.region}
selection-foreground = ${s.fg}
`+ansi.map((v,i)=>`palette = ${i}=${v}\n`).join(''));
  write('kitty.conf',`background ${s.bg}
foreground ${s.fg}
background_opacity 1.0
cursor ${s.fg}
cursor_text_color ${s.bg}
selection_background ${s.region}
selection_foreground ${s.fg}
active_border_color ${s.accent}
inactive_border_color ${s.border}
active_tab_foreground ${s.fg}
active_tab_background ${s.completion}
inactive_tab_foreground ${s.chrome}
inactive_tab_background ${s.dim}
`+ansi.map((v,i)=>`color${i} ${v}\n`).join(''));
  const foot=`foreground=${s.fg.slice(1)}\nbackground=${s.bg.slice(1)}\nalpha=1.0\ncursor=${s.bg.slice(1)} ${s.fg.slice(1)}\nselection-foreground=${s.fg.slice(1)}\nselection-background=${s.region.slice(1)}\n`
    +ansi.map((v,i)=>`${i<8?'regular':'bright'}${i%8}=${v.slice(1)}\n`).join('');
  write('foot.ini','[colors-dark]\n'+foot+'\n[colors-light]\n'+foot);

  // Cliamp's ANSI fallback assumes white text on a dark terminal.
  const cliamp={bg:s.bg,accent:s.accent,bright_fg:s.fg,fg:s.chrome,
    green:u.green,yellow:u.yellow,red:u.red};
  write('cliamp.toml',`# ${title}: explicit colors for Cliamp 2.x.\n`+table(cliamp));

  let btop=render('btop.theme');
  for (const [key,value] of Object.entries({selected_bg:s.completion,selected_fg:s.fg,
    graph_text:s.fg,proc_misc:u.cyan,cpu_box:s.accent,mem_box:s.accent,net_box:s.accent,proc_box:s.accent,
    available_start:u.cyan,available_mid:u.blue,available_end:u.blue,
    download_start:u.cyan,download_mid:u.blue,download_end:u.blue})) {
    btop=btop.replace(new RegExp(`theme\\[${key}\\]="[^"]*"`),`theme[${key}]="${value}"`);
  }
  write('btop.theme',btop);

  // Helix has structured color/face syntax; all paired text gets explicit fg.
  const face=(fg,bg,modifiers)=>'{ '+[
    fg ? `fg = ${q(fg)}` : '',bg ? `bg = ${q(bg)}` : '',
    modifiers ? `modifiers = ${q(modifiers)}` : '',
  ].filter(Boolean).join(', ')+' }';
  const hx={
    keyword:q(u.keyword),'keyword.control':q(u.keyword),function:q(u.fnname),
    'function.builtin':q(u.builtin),'function.macro':q(u.builtin),constructor:q(u.type),
    type:q(u.type),'type.builtin':q(u.type),string:q(u.string),comment:q(u.comment),
    variable:q(u.variable),'variable.parameter':q(u.variable),'variable.other.member':q(u.property),
    'constant.numeric':q(s.fg),punctuation:q(s.fg),operator:q(s.fg),
    'ui.background':face(s.fg,s.bg),'ui.linenr':face(s.chrome,s.dim),
    'ui.linenr.selected':face(s.fg,s.dim,['bold']),
    'ui.statusline':face(s.fg,s.status),'ui.statusline.inactive':face(s.chrome,s.inactiveStatus),
    'ui.statusline.normal':face(s.fg,s.status,['bold']),
    'ui.statusline.insert':face(s.fg,u['bg-green-subtle'],['bold']),
    'ui.statusline.select':face(s.fg,u['bg-magenta-subtle'],['bold']),
    'ui.cursorline.primary':face(null,s.bg),'ui.cursor.match':face(s.fg,s.paren,['bold']),
    'ui.menu.selected':face(s.fg,s.completion,['bold']),
    'ui.text.focus':face(s.fg,s.completion,['bold']),
    'ui.selection':face(s.fg,s.region),
    'markup.bold':face(null,null,['bold']),'markup.italic':face(null,null,['italic']),
    'diagnostic.unnecessary':q(s.chrome),
  };
  for(let i=1;i<=6;i++) hx[`markup.heading.${i}`]=face(u[`fg-heading-${i}`],null,['bold']);
  let helix=render('helix.toml').split('\n').map(line=>{
    const match=line.match(/^"([^"]+)" = /);
    return match&&Object.hasOwn(hx,match[1]) ? `${q(match[1])} = ${hx[match[1]]}` : line;
  }).join('\n').replace('# Leave the editor background transparent so the terminal background shows through','# Opaque canvas preserves contrast.');
  write('helix.toml',helix);

  const h={
    Normal:{fg:s.fg,bg:s.bg},NormalNC:{fg:s.fg,bg:s.bg},NormalFloat:{fg:s.fg,bg:s.bg},
    FloatBorder:{fg:s.accent,bg:s.bg},Comment:{fg:u.comment},Constant:{fg:u.constant},
    String:{fg:u.string},Character:{fg:u.string},Number:{fg:s.fg},Boolean:{fg:u.constant},
    Identifier:{fg:u.variable},Function:{fg:u.fnname},Statement:{fg:u.keyword},Keyword:{fg:u.keyword},
    PreProc:{fg:u.preprocessor},Type:{fg:u.type},Special:{fg:u.builtin},Delimiter:{fg:s.fg},Operator:{fg:s.fg},
    LineNr:{fg:s.chrome,bg:s.dim},CursorLineNr:{fg:s.fg,bg:s.dim,bold:true},CursorLine:{bg:s.bg},
    Visual:{fg:s.fg,bg:s.region},Search:{fg:s.fg,bg:s.lazySearch},IncSearch:{fg:s.fg,bg:s.search},
    CurSearch:{fg:s.fg,bg:s.search},MatchParen:{fg:s.fg,bg:s.paren,bold:true},
    Pmenu:{fg:s.fg,bg:s.bg},PmenuSel:{fg:s.fg,bg:s.completion,bold:true},
    PmenuSbar:{bg:u['bg-inactive']},PmenuThumb:{bg:s.chrome},
    StatusLine:{fg:s.fg,bg:s.status},StatusLineNC:{fg:s.chrome,bg:s.inactiveStatus},
    TabLine:{fg:s.chrome,bg:s.dim},TabLineSel:{fg:s.fg,bg:s.completion,bold:true},TabLineFill:{bg:s.dim},
    WinSeparator:{fg:s.border},SignColumn:{fg:s.fg,bg:s.dim},FoldColumn:{fg:s.chrome,bg:s.dim},
    Folded:{fg:s.chrome,bg:s.dim},NonText:{fg:s.border},Whitespace:{fg:s.border},EndOfBuffer:{fg:s.bg},
    Directory:{fg:s.accent},Title:{fg:s.fg,bold:true},ErrorMsg:{fg:u.err},WarningMsg:{fg:u.warning},MoreMsg:{fg:u.info},
    DiagnosticError:{fg:u.err},DiagnosticWarn:{fg:u.warning},DiagnosticInfo:{fg:u.info},DiagnosticHint:{fg:u.cyan},
    DiagnosticUnnecessary:{fg:s.chrome},
    DiffAdd:{fg:u['fg-added'],bg:u['bg-added']},DiffDelete:{fg:u['fg-removed'],bg:u['bg-removed']},
    DiffChange:{fg:u['fg-changed'],bg:u['bg-changed']},DiffText:{fg:s.fg,bg:u['bg-changed-refine'],bold:true},
    '@variable':{fg:u.variable},'@variable.member':{fg:u.property},'@function.call':{fg:u['fnname-call']},
    '@function.builtin':{fg:u.builtin},'@string.documentation':{fg:u.docstring},
    '@markup.link.url':{fg:u['fg-link'],underline:true},
  };
  for(let i=1;i<=6;i++) h[`@markup.heading.${i}`]={fg:u[`fg-heading-${i}`],bold:true};
  for (const [level,fg] of Object.entries({Error:u.err,Warn:u.warning,Info:u.info,Hint:u.cyan})) {
    h['DiagnosticUnderline'+level]={sp:fg,undercurl:true};
    h['DiagnosticVirtualText'+level]={fg,bg:s.bg};
  }
  const luaGroups=Object.entries(h).map(([key,spec])=>`        [${q(key)}] = { ${Object.entries(spec).map(([k,v])=>`${k} = ${q(v)}`).join(', ')} },`).join('\n');
  write('neovim.lua',`-- SPDX-License-Identifier: GPL-3.0-or-later
-- Self-contained ${title} for LazyVim.
return {{
  "LazyVim/LazyVim",
  opts = {
    colorscheme = function()
      vim.opt.termguicolors = true
      vim.opt.background = ${q(p.mode)}
      vim.cmd("highlight clear")
      vim.g.colors_name = ${q(name)}
      local groups = {
${luaGroups}
      }
      for key, spec in pairs(groups) do vim.api.nvim_set_hl(0, key, spec) end
      local ansi = { ${ansi.map(q).join(', ')} }
      for i, color in ipairs(ansi) do vim.g["terminal_color_" .. (i - 1)] = color end
      vim.api.nvim_exec_autocmds("ColorScheme", { pattern = ${q(name)} })
    end,
  },
}}
`);

  const vscode=JSON.parse(render('vscode-theme.json'));
  vscode.name=title; vscode.type=p.mode;
  Object.assign(vscode.colors,{
    'editor.background':s.bg,'editor.foreground':s.fg,
    'editor.selectionBackground':s.region,'editor.selectionForeground':s.fg,
    'editor.inactiveSelectionBackground':u['bg-inactive'],'editor.lineHighlightBackground':s.bg,
    'editorLineNumber.foreground':s.chrome,'editorLineNumber.activeForeground':s.fg,
    'focusBorder':s.accent,'foreground':s.fg,'descriptionForeground':s.chrome,
    'disabledForeground':s.chrome,'input.placeholderForeground':s.chrome,
    'list.activeSelectionBackground':s.completion,'list.activeSelectionForeground':s.fg,
    'list.inactiveSelectionBackground':u['bg-inactive'],'list.inactiveSelectionForeground':s.fg,
    'list.hoverBackground':s.dim,'list.hoverForeground':s.fg,
    'list.highlightForeground':s.accent,'list.focusHighlightForeground':s.completionMatch,
    'statusBar.background':s.status,'statusBar.foreground':s.fg,
    'statusBar.noFolderBackground':s.status,'statusBar.noFolderForeground':s.fg,
    'statusBar.debuggingBackground':u['bg-yellow-nuanced'],'statusBar.debuggingForeground':s.fg,
    'statusBarItem.remoteBackground':s.accent,'statusBarItem.remoteForeground':s.bg,
    'button.background':s.accent,'button.foreground':s.bg,'button.hoverBackground':u['blue-cooler'],
    'badge.background':s.accent,'badge.foreground':s.bg,
    'activityBar.foreground':s.accent,'activityBar.inactiveForeground':s.chrome,
    'tab.activeForeground':s.fg,'tab.inactiveForeground':s.chrome,
    'editor.findMatchBackground':s.search,'editor.findMatchForeground':s.fg,
    'editor.findMatchHighlightBackground':s.lazySearch,'editor.findMatchHighlightForeground':s.fg,
    'editorError.foreground':u.err,'editorWarning.foreground':u.warning,'editorInfo.foreground':u.info,'editorHint.foreground':u.cyan,
    'diffEditor.insertedTextBackground':u['bg-added']+'80','diffEditor.removedTextBackground':u['bg-removed']+'80',
    'terminal.foreground':s.fg,'terminal.background':s.bg,'terminalCursor.foreground':s.fg,'terminalCursor.background':s.bg,
  });
  names.forEach((n,i)=>{
    const suffix=n[0].toUpperCase()+n.slice(1);
    vscode.colors['terminal.ansi'+suffix]=ansi[i];vscode.colors['terminal.ansiBright'+suffix]=ansi[i+8];
  });
  vscode.tokenColors=[
    [['comment'],u.comment],[['string'],u.string],[['comment.block.documentation'],u.docstring],
    [['keyword','storage'],u.keyword],[['keyword.operator','punctuation','constant.numeric'],s.fg],
    [['entity.name.function'],u.fnname],[['support.function'],u.builtin],
    [['entity.name.type','support.type'],u.type],[['variable'],u.variable],
    [['constant.language','constant.other'],u.constant],[['markup.heading'],s.fg,'bold'],
    [['markup.bold'],s.fg,'bold'],[['markup.italic'],s.fg,'italic'],
    [['markup.underline.link'],u['fg-link'],'underline'],[['markup.inline.raw'],u['fg-prose-code']],
  ].map(([scope,foreground,fontStyle])=>({scope,settings:{foreground,...(fontStyle?{fontStyle}:{})}}));
  vscode.semanticHighlighting=true;
  vscode.semanticTokenColors={function:u.fnname,method:u.fnname,'function.defaultLibrary':u.builtin,
    variable:u.variable,parameter:u.variable,property:u.property,type:u.type,class:u.type,
    keyword:u.keyword,string:u.string,number:s.fg,comment:u.comment};
  write('vscode-theme.json',JSON.stringify(vscode,null,2)+'\n');

  mkdirSync(join(out,'backgrounds'),{recursive:true});
  mkdirSync(join(root,'artwork'),{recursive:true});
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160" viewBox="0 0 3840 2160">
<rect width="3840" height="2160" fill="${s.dim}"/>
<path d="M0 0H3840V520L2040 2160H0Z" fill="${s.bg}"/>
<path d="M3840 540V2160H2060Z" fill="${u['bg-blue-nuanced']}"/>
<path d="M2860 2160L3840 1267V2160Z" fill="${u['bg-inactive']}"/>
<path d="M0 1680H1300L2780 332H3840" fill="none" stroke="${u['bg-inactive']}" stroke-width="2"/>
<path d="M2635 477L2780 345" fill="none" stroke="${s.accent}" stroke-width="5"/>
</svg>\n`;
  const svgPath=join(root,'artwork',`${name}.svg`);
  writeFileSync(svgPath,svg);
  execFileSync('magick',[svgPath,'-strip',join(out,'backgrounds/01-paper.png')]);
  // The picker previews the desktop; wallpapers remain under backgrounds/.
  execFileSync('magick',[
    join(root,'screenshots',`${name}.webp`),'-strip','-resize','960x540>',
    join(out,'preview.png'),
  ]);

  const pairs=[];
  const check=(label,fg,bg,min=7)=>pairs.push({name:label,fg,bg,min});
  for (const key of ['bright_fg','fg','accent','green','yellow','red']) {
    check('Cliamp '+key,cliamp[key],cliamp.bg);
  }
  check('Cliamp help key',s.bg,cliamp.accent);
  for (const key of ['foreground','muted','light_foreground','red','green','yellow','blue','magenta','cyan',
    'bright_red','bright_green','bright_yellow','bright_blue','bright_magenta','bright_cyan']) check(key+' on canvas',p[key],s.bg);
  check('secondary text on chrome',s.chrome,s.dim);
  check('secondary text on inactive surface',s.chrome,u['bg-inactive']);
  check('bar alert',s.alert,s.dim);
  check('selection',s.fg,s.region);
  check('completion',s.fg,s.completion);
  check('completion match',s.completionMatch,s.completion);
  check('inactive status line',s.chrome,s.inactiveStatus);
  check('lock placeholder',s.chrome,s.bg);
  for (const [label,bg] of Object.entries({search:s.search,lazySearch:s.lazySearch,paren:s.paren,
    insertStatus:u['bg-green-subtle'],selectStatus:u['bg-magenta-subtle']})) check(label,s.fg,bg);
  check('focus border',s.accent,s.bg,3);
  check('focus border on selection',s.accent,s.completion,3);
  const mix=(fg,bg,a)=>'#'+[1,3,5].map(i=>Math.round(parseInt(fg.slice(i,i+2),16)*a+parseInt(bg.slice(i,i+2),16)*(1-a)).toString(16).padStart(2,'0')).join('');
  for (const [label,alpha] of Object.entries({normal:0.02,hover:0.06,focus:0.06,selected:0.14,pressed:0.18})) {
    const bg=mix(s.fg,s.bg,alpha);check(label+' control text',s.fg,bg);check(label+' control border',s.accent,bg,3);
  }
  for(const [key,spec] of Object.entries(h)) {
    if(spec.fg&&!['NonText','Whitespace','EndOfBuffer','WinSeparator'].includes(key)) check('Neovim '+key,spec.fg,spec.bg||s.bg);
  }
  write('contrast-pairs.json',JSON.stringify(pairs,null,2)+'\n');
  console.log(`Built ${title}: theme, editors, wallpaper, and ${pairs.length} contrast pairs.`);
}
