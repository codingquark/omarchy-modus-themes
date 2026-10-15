// SPDX-License-Identifier: GPL-3.0-or-later

const identifier = /^[A-Za-z0-9_]+$/;
const hexColor = /^#[0-9a-f]{6}$/i;

// A deliberately bounded subset of Omarchy's template language: palette keys,
// color modifiers, and two-color mixes. New upstream functions must be reviewed.
export function renderTemplate(template, values, source = 'template') {
  const fail = (offset, message) => {
    const line = template.slice(0, offset).split('\n').length;
    throw new Error(`${source}:${line}: ${message}`);
  };
  const valueFor = (key, offset) => {
    if (!Object.hasOwn(values, key) || typeof values[key] !== 'string') {
      fail(offset, `Unknown template key: ${key}`);
    }
    return values[key];
  };
  const channels = (value, offset) => {
    if (!hexColor.test(value)) fail(offset, `Expected #RRGGBB color, got ${JSON.stringify(value)}`);
    return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
  };
  const format = (value, modifier, offset) => {
    if (modifier === 'strip') return value.replace(/^#/, '');
    if (modifier === 'rgb') return channels(value, offset).join(',');
    return value;
  };

  const rendered = template.replace(/\{\{([^{}]*)\}\}/g, (token, content, offset) => {
    const expression = content.trim();
    if (identifier.test(expression)) {
      if (Object.hasOwn(values, expression)) return valueFor(expression, offset);
      const modified = expression.match(/^(.+)_(strip|rgb)$/);
      if (modified) return format(valueFor(modified[1], offset), modified[2], offset);
      return valueFor(expression, offset);
    }

    const mix = expression.match(/^(mix|mix_strip|mix_rgb)\s+([A-Za-z0-9_]+)\s+([A-Za-z0-9_]+)\s+([0-9]+(?:\.[0-9]+)?%?)$/);
    if (!mix) fail(offset, `Unsupported template expression: ${JSON.stringify(expression)}`);
    const [, fn, startKey, endKey, amountText] = mix;
    const start = channels(valueFor(startKey, offset), offset);
    const end = channels(valueFor(endKey, offset), offset);
    let amount = Number(amountText.replace(/%$/, ''));
    if (!Number.isFinite(amount)) fail(offset, `Invalid mix amount: ${amountText}`);
    // Upstream accepts a fraction, a percentage, or a bare number above one
    // interpreted as a percentage; it clamps the result to the color endpoints.
    if (amountText.endsWith('%') || amount > 1) amount /= 100;
    amount = Math.min(1, Math.max(0, amount));
    const mixed = '#' + start.map((channel, index) =>
      Math.floor(channel * (1 - amount) + end[index] * amount + 0.5)
        .toString(16).padStart(2, '0')).join('');
    return format(mixed, fn.slice(4), offset);
  });

  if (/\{\{|\}\}/.test(rendered)) {
    throw new Error(`${source}: Unresolved or malformed template delimiter`);
  }
  return rendered;
}
