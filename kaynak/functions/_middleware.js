// Max Efor — public page middleware (Cloudflare Pages Functions)
//
// Runs for the paths listed in public/_routes.json (the public pages and /api/*):
//   - www.max-efor.com page requests are redirected to max-efor.com (one address per page for search engines)
//   - published announcements are written into the page HTML, so the pinned announcement bar does not
//     push the page down after loading and crawlers that do not run JavaScript also see them
//
// The announcement markup mirrors annCard() in index.html; keep the two in sync.

const DATA_KEY = 'announcements';
const TYPE_LABEL = { duyuru: 'Duyuru', ilan: 'İş ilanı', bilgi: 'Bilgilendirme' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeLink = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
const byDisplayOrder = (a, b) => (Number(b.pinned) - Number(a.pinned)) || String(b.createdAt).localeCompare(String(a.createdAt));

function fmtDate(iso) {
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(new Date(iso));
  } catch {
    return '';
  }
}

function annCard(a, full) {
  const link = safeLink(a.link);
  const type = TYPE_LABEL[a.type] ? a.type : 'duyuru';
  const action = link
    ? `<a class="link-go" href="${esc(link)}" target="_blank" rel="noopener">${esc(a.linkText || 'Detaylar')} <svg class="icon"><use href="#i-arrow-ur"/></svg></a>`
    : (full ? '' : '<a class="link-go" href="/duyurular">Devamını oku <svg class="icon"><use href="#i-arrow"/></svg></a>');
  return `<article class="ann${full ? ' ann--full' : ''}">
      <div class="ann__meta"><span class="ann__type ann__type--${type}">${TYPE_LABEL[type]}</span><time datetime="${esc(a.createdAt)}">${fmtDate(a.createdAt)}</time></div>
      <h3 class="ann__title">${esc(a.title)}</h3>
      <p class="ann__body">${esc(a.body).replace(/\n/g, '<br>')}</p>
      ${action}
    </article>`;
}

const setHidden = (hidden) => ({ element(el) { if (hidden) el.setAttribute('hidden', ''); else el.removeAttribute('hidden'); } });
const setHTML = (html) => ({ element(el) { el.setInnerContent(html, { html: true }); } });
const setText = (text) => ({ element(el) { el.setInnerContent(text); } });

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const isPage = (request.method === 'GET' || request.method === 'HEAD') && !url.pathname.startsWith('/api/');

  if (isPage && url.hostname === 'www.max-efor.com') {
    url.hostname = 'max-efor.com';
    return Response.redirect(url.toString(), 301);
  }

  const response = await next();
  if (!isPage || response.status !== 200 || !env.MAXEFOR_KV
      || !(response.headers.get('Content-Type') || '').includes('text/html')) {
    return response;
  }

  let items;
  try {
    const all = (await env.MAXEFOR_KV.get(DATA_KEY, { type: 'json', cacheTtl: 60 })) || [];
    items = all.filter((a) => a.published).sort(byDisplayOrder);
  } catch {
    return response; // the page then loads the announcements itself from /api/announcements
  }

  const top = items.find((a) => a.pinned);
  const rewriter = new HTMLRewriter()
    .on('html', { element(el) { el.setAttribute('data-ann', 'ssr'); } })
    .on('#homeAnnSection', setHidden(items.length === 0))
    .on('#homeAnn', setHTML(items.slice(0, 3).map((a) => annCard(a, false)).join('')));
  if (items.length) rewriter.on('#annList', setHTML(items.map((a) => annCard(a, true)).join('')));
  if (top) {
    rewriter
      .on('#annbar', setHidden(false))
      .on('#annbarType', setText(TYPE_LABEL[top.type] || 'Duyuru'))
      .on('#annbarLink', setText(top.title));
  }

  const out = new Response(rewriter.transform(response).body, response);
  out.headers.delete('ETag'); // the body now differs from the static file
  return out;
}
