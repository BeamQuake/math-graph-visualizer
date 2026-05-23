const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '-': '⁻', '+': '⁺',
};

function toSuperscript(n: string): string {
  return [...n].map(c => SUPERSCRIPT_MAP[c] ?? c).join('');
}

function findMatchingParen(s: string, openIdx: number): number {
  let depth = 1;
  for (let i = openIdx + 1; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function colourise(s: string): string {
  let t = s.replace(/\^(\d+(?:\.\d+)?)/g, (_, d) => toSuperscript(d));

  const tokenRe = /(sin|cos|tan|ln|exp|sqrt|abs|log|sinh|cosh|tanh|arcsin|arccos|arctan|lg)\b|(\d+\.?\d*)|([a-zA-Zπ])|([+\-−^=×÷/·])|([()])|(.)/g;

  return t.replace(tokenRe, (match, fn, num, letter, op, paren, _other) => {
    if (fn) return `<span class="math-fn">${fn}</span>`;
    if (num) return `<span class="math-num">${num}</span>`;
    if (letter) {
      if (letter === 'π' || letter === 'e') {
        return `<span class="math-const">${letter}</span>`;
      }
      return `<span class="math-var">${letter}</span>`;
    }
    if (op) return `<span class="math-op">${op}</span>`;
    if (paren) return `<span class="math-paren">${paren}</span>`;
    return match;
  });
}

export function formatExpression(raw: string): string {
  if (!raw) return '<span class="math-op">—</span>';

  let s = raw;

  // --- Normalize ---
  s = s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\b1\^\d+(?:\.\d+)?/g, '1')
    .replace(/\*1(?=[a-zA-Zπ()\s+\-*/])/g, '')
    .replace(/\*1$/g, '')
    .replace(/^1\*/g, '')
    .replace(/\b0\*[a-zA-Z]+\b/g, '')
    .replace(/(?:\+\s*)?0(?:\*[a-zA-Z])?(?:\s*\+\s*)?/g, (m) => {
      if (m.includes('+')) return '';
      return m;
    })
    .replace(/^0\s*\+\s*/g, '')
    .replace(/\s*\+\s*0$/g, '')
    .replace(/\+ -/g, '- ')
    .replace(/\bx\^1\b/g, 'x')
    .trim();

  s = s.replace(/^\+ /, '').replace(/^- /, '-').trim();

  if (!s) return '<span class="math-op">∅</span>';

  // --- Implied multiplication ---
  s = s.replace(/(\d)\*(?=[a-zA-Zπ(])/g, '$1');
  s = s.replace(/\*([a-zA-Zπ])/g, '$1');
  s = s.replace(/\)\*/g, ')');
  s = s.replace(/\*\(/g, '(');
  s = s.replace(/\*/g, '·');

  // --- Humanise ---
  s = s.replace(/exp\(/g, 'e^(');
  s = s.replace(/\bpi\b/g, 'π');

  // --- Handle e^(exponent) with superscript ---
  let html = '';
  let pos = 0;
  while (pos < s.length) {
    const idx = s.indexOf('e^(', pos);
    if (idx === -1) {
      html += colourise(s.slice(pos));
      break;
    }

    html += colourise(s.slice(pos, idx));

    const openIdx = idx + 2;
    const closeIdx = findMatchingParen(s, openIdx);
    if (closeIdx === -1) {
      html += colourise(s.slice(idx));
      break;
    }

    const expContent = s.slice(openIdx, closeIdx + 1);
    html += '<span class="math-const">e</span><span class="math-sup">' + colourise(expContent) + '</span>';

    pos = closeIdx + 1;
  }

  return html;
}

export function renderEToThe(s: string): string {
  let html = '';
  let pos = 0;
  while (pos < s.length) {
    const idx = s.indexOf('e^(', pos);
    if (idx === -1) {
      html += s.slice(pos);
      break;
    }

    html += s.slice(pos, idx);

    const openIdx = idx + 2;
    const closeIdx = findMatchingParen(s, openIdx);
    if (closeIdx === -1) {
      html += s.slice(idx);
      break;
    }

    const expContent = s.slice(openIdx, closeIdx + 1);
    html += '<span class="math-const">e</span><span class="math-sup">' + expContent + '</span>';

    pos = closeIdx + 1;
  }

  return html;
}
