// functions/_middleware.js
//
// Markdown for Agents, free tier.
//
// When a client sends `Accept: text/markdown`, return the page's <main> content
// as clean Markdown instead of HTML, with a citation header (title, canonical
// URL, publication, ISSN). Browsers never send text/markdown, so humans and
// search crawlers keep getting the HTML page untouched.
//
// Zero dependencies: uses the Workers runtime's built-in HTMLRewriter, and
// converts the live HTML on each request, so there is no second copy of any
// page to drift out of sync.
//
// Test:  curl -H "Accept: text/markdown" https://technicalmarketing.org/what-is-technical-marketing

const PUBLICATION = 'Technical Marketing';
const ISSN = '3143-6412';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

const BLOCK = { h1: '# ', h2: '## ', h3: '### ', h4: '#### ', h5: '##### ', h6: '###### ' };

function wantsMarkdown(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return false;
  const accept = request.headers.get('Accept') || '';
  return /\btext\/markdown\b/i.test(accept);
}

function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&middot;/g, '·')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

async function toMarkdown(response, url) {
  const meta = { title: '', description: '', canonical: '', lang: '', author: '' };
  const out = [];
  let skipDepth = 0;
  let inMain = false;
  let titleBuf = '';

  const push = (s) => { if (inMain && skipDepth === 0) out.push(s); };

  const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'template', 'svg', 'nav', 'form', 'button',
    'input', 'label', 'select', 'textarea', 'iframe', 'video', 'audio']);
  const SKIP_CLASSES = ['fmc', 'toc', 'toc-mobile', 'pref-card', 'visually-hidden', 'sr-only'];

  const isSkipped = (el, tag) => {
    if (SKIP_TAGS.has(tag)) return true;
    if (el.hasAttribute('hidden')) return true;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    const cls = (el.getAttribute('class') || '').split(/\s+/);
    return SKIP_CLASSES.some((c) => cls.includes(c));
  };

  // One element handler for everything inside <main>. HTMLRewriter keeps only
  // the last onEndTag registered per element, so each element registers once.
  // Register an end-tag callback when the element has one. Self-closing
  // elements (common inside inline SVG) and implied end tags have none, and
  // HTMLRewriter throws if asked.
  const onEnd = (el, fn) => {
    if (el.selfClosing) return false;
    try { el.onEndTag(fn); return true; } catch (_) { return false; }
  };

  const mainHandler = {
    element(el) {
      if (!inMain) return;
      const tag = el.tagName.toLowerCase();
      if (VOID.has(tag)) {
        if (tag === 'br') push('  \n');
        return;
      }
      if (skipDepth > 0 || isSkipped(el, tag)) {
        if (onEnd(el, () => { skipDepth--; })) skipDepth++;
        return;
      }
      let open = '', close = '';
      if (BLOCK[tag]) { open = '\n\n' + BLOCK[tag]; close = '\n\n'; }
      else if (tag === 'p') { open = '\n\n'; close = '\n\n'; }
      else if (tag === 'li') { open = '\n- '; close = '\n'; }
      else if (tag === 'blockquote') { open = '\n\n> '; close = '\n\n'; }
      else if (tag === 'figcaption') { open = '\n\n_'; close = '_\n\n'; }
      else if (tag === 'strong' || tag === 'b') { open = close = '**'; }
      else if (tag === 'em' || tag === 'i') { open = close = '_'; }
      else if (tag === 'a') {
        let href = el.getAttribute('href') || '';
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          try { href = new URL(href, url).toString(); open = '['; close = `](${href})`; } catch (_) { /* plain text */ }
        }
      }
      if (close && !onEnd(el, () => push(close))) return;
      if (open) push(open);
    },
    text(t) {
      if (!inMain || skipDepth > 0) return;
      const txt = decode(t.text).replace(/\s+/g, ' ');
      if (txt) out.push(txt);
    },
  };

  const rw = new HTMLRewriter()
    .on('html', { element(el) { meta.lang = el.getAttribute('lang') || ''; } })
    .on('head > title', { text(t) { titleBuf += t.text; } })
    .on('meta[name="description"]', { element(el) { meta.description = el.getAttribute('content') || ''; } })
    .on('meta[name="author"]', { element(el) { meta.author = el.getAttribute('content') || ''; } })
    .on('link[rel="canonical"]', { element(el) { meta.canonical = el.getAttribute('href') || ''; } })
    .on('main', {
      element(el) {
        inMain = true;
        el.onEndTag(() => { inMain = false; });
      },
    })
    .on('main *', mainHandler);

  // Drain the rewritten stream; we only want the side effects.
  await rw.transform(response).arrayBuffer();

  meta.title = decode(titleBuf.trim());
  const canonical = meta.canonical || url.toString();

  let body = out.join('')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n- \s*\n/g, '\n')       // empty list items
    .replace(/\*\*\s*\*\*/g, '')       // empty bold
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]\(/g, '](')
    .replace(/\[\s*\]\([^)]*\)/g, '')  // empty links
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const header = [
    '---',
    `title: ${JSON.stringify(meta.title)}`,
    meta.description ? `description: ${JSON.stringify(decode(meta.description))}` : null,
    `url: ${canonical}`,
    `publication: ${PUBLICATION}`,
    `issn: ${ISSN}`,
    meta.author ? `author: ${JSON.stringify(decode(meta.author))}` : null,
    meta.lang ? `language: ${meta.lang}` : null,
    `cite_as: "${meta.title}. ${PUBLICATION} (ISSN ${ISSN}). ${canonical}"`,
    '---',
  ].filter(Boolean).join('\n');

  return { markdown: header + '\n\n' + body + '\n', canonical };
}

export const onRequest = async ({ request, next }) => {
  if (!wantsMarkdown(request)) return next();

  const url = new URL(request.url);
  // Only page routes: no file extension, or .html.
  const last = url.pathname.split('/').pop();
  if (last.includes('.') && !last.endsWith('.html')) return next();

  const res = await next();
  const fallback = res.clone();
  const type = res.headers.get('Content-Type') || '';
  if (res.status !== 200 || !type.includes('text/html')) return res;

  try {
    const { markdown, canonical } = await toMarkdown(res, url);
    return new Response(request.method === 'HEAD' ? null : markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Link': `<${canonical}>; rel="canonical"`,
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Source': 'html-to-markdown',
      },
    });
  } catch (err) {
    // Never break a page for an agent; fall back to the HTML.
    return fallback;
  }
};
