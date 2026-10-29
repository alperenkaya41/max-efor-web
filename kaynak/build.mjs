// Max Efor — builds one HTML file per page from the single source file.
//
//   node build.mjs [kaynak.html]      (default: ./index.html)
//
// For every page in PAGES it writes public/<page>.html (home → public/index.html) that contains
// only that page's content, with its own <title>, description, canonical address and breadcrumb
// data, so search engines index each page separately. Also writes public/404.html and
// public/sitemap.xml. Run it before every deploy.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(process.argv[2] || join(ROOT, 'index.html'));
const OUT = join(ROOT, 'public');
const SITE = 'https://max-efor.com';

const PAGES = {
  home: {
    path: '/',
    title: 'Max Efor Danışmanlık · Personel Temini | Körfez, Kocaeli',
    description: 'Körfez/Kocaeli merkezli Max Efor Danışmanlık: fabrika personeli temini, lojistik yükleme-boşaltma, çay servisi, organizasyon güvenliği ve esnek iş gücü çözümleri.'
  },
  kurumsal: {
    path: '/kurumsal', crumb: 'Kurumsal',
    title: 'Kurumsal · Max Efor Danışmanlık | Körfez, Kocaeli',
    description: "2017'de Körfez'de Kaya Grup olarak başlayan Max Efor Danışmanlık Sosyal Hizmetler Ltd. Şti.'nin kurumsal künyesi, çalışma ilkeleri ve yetkilileri."
  },
  hizmetler: {
    path: '/hizmetler', crumb: 'Hizmetler',
    title: 'Hizmetler · Fabrika, Lojistik ve Destek Personeli | Max Efor',
    description: 'Fabrika ve üretim personeli, lojistik yükleme-boşaltma ekipleri, çay servisi ve destek personeli, organizasyon güvenliği ve esnek iş gücü danışmanlığı — Kocaeli geneli.'
  },
  tarihce: {
    path: '/tarihce', crumb: 'Tarihçe',
    title: "Tarihçe · Kaya Grup'tan Max Efor'a | Max Efor Danışmanlık",
    description: "2017'de Körfez'de Kaya Grup ile başlayan, Essity ve Hyundai – Gefest TR sanayi operasyonlarıyla büyüyen Max Efor Danışmanlık'ın tarihçesi."
  },
  referanslar: {
    path: '/referanslar', crumb: 'Referanslar',
    title: 'Referanslar · 17 Kurumsal Referans | Max Efor Danışmanlık',
    description: "Ford Otosan, Tırsan, Essity, Akçelik, Kocaeli Büyükşehir Belediyesi ve daha fazlası: Max Efor Danışmanlık'ın sanayi, lojistik, finans ve kamu alanındaki 17 referansı."
  },
  iletisim: {
    path: '/iletisim', crumb: 'İletişim',
    title: 'İletişim · Max Efor Danışmanlık | Körfez, Kocaeli',
    description: 'Max Efor Danışmanlık merkez ofisi: Esentepe Mah. Burak Sk. No:7 Kat:3 Körfez/Kocaeli. Alperen Kaya 0539 697 45 00 · Kemal Kaya 0545 679 72 42.'
  },
  talep: {
    path: '/talep', crumb: 'Personel talebi', legal: true,
    title: "Personel Talebi · Kocaeli'de Personel Temini | Max Efor",
    description: 'Firmanız için fabrika, lojistik, çay servisi veya organizasyon personeli talebinizi üç adımda oluşturun; teklif mesajınız WhatsApp veya e-postayla yetkiliye ulaşsın.'
  },
  basvuru: {
    path: '/basvuru', crumb: 'İş başvurusu', legal: true,
    title: "İş Başvurusu · Kocaeli'de Üretim ve Lojistik İşleri | Max Efor",
    description: "Kocaeli'de üretim, yükleme-boşaltma, çay servisi ve güvenlik/organizasyon alanlarında iş arıyorsanız başvurunuzu WhatsApp veya e-postayla hemen iletin."
  },
  duyurular: {
    path: '/duyurular', crumb: 'Duyurular',
    title: 'Duyurular ve İş İlanları · Max Efor Danışmanlık',
    description: "Max Efor Danışmanlık'tan güncel duyurular, iş ilanları ve bilgilendirmeler."
  },
  kvkk: {
    path: '/kvkk', crumb: 'KVKK Aydınlatma Metni',
    title: 'KVKK Aydınlatma Metni · Max Efor Danışmanlık',
    description: '6698 sayılı KVKK kapsamında Max Efor Danışmanlık Sosyal Hizmetler Ltd. Şti. kişisel veri işleme aydınlatma metni.'
  },
  'cerez-politikasi': {
    path: '/cerez-politikasi', crumb: 'Çerez Politikası',
    title: 'Çerez Politikası · Max Efor Danışmanlık',
    description: "max-efor.com'da kullanılan çerezler, üçüncü taraf hizmetler ve çerez tercihlerinizi nasıl yönetebileceğiniz."
  }
};

const NOT_FOUND = `<div class="page" data-page="404">
  <header class="page-head">
    <div class="container">
      <p class="crumb"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span><a href="/">Ana sayfa</a><span>/</span>Sayfa bulunamadı</p>
      <h1 class="page-title">Aradığınız sayfa bulunamadı</h1>
      <p class="lead">Adres değişmiş ya da sayfa kaldırılmış olabilir. Aşağıdaki bağlantılardan devam edebilirsiniz.</p>
      <div class="hero__ctas" style="margin-top:28px">
        <a class="btn btn--primary" href="/">Ana sayfaya dön</a>
        <a class="btn btn--outline" href="/hizmetler">Hizmetler</a>
        <a class="btn btn--outline" href="/iletisim">İletişim</a>
      </div>
    </div>
  </header>
</div>`;

const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function replaceOnce(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`Kaynakta bulunamadı: ${label}`);
  return html.replace(pattern, replacement);
}

const source = readFileSync(SOURCE, 'utf8');

// Every page block starts with <div class="page" data-page="…"> and ends at the next </div> in column 0.
const PAGE_RE = /(?:<!-- =+\n[^\n]*\n\s*=+ -->\n)?<div class="page" data-page="([^"]+)"[^>]*>[\s\S]*?\n<\/div>\n/g;
const blocks = new Map([...source.matchAll(PAGE_RE)].map((m) => [m[1], m[0]]));
for (const name of Object.keys(PAGES)) if (!blocks.has(name)) throw new Error(`Kaynakta sayfa yok: ${name}`);

const firstBlock = source.search(PAGE_RE);
const withoutPages = source.replace(PAGE_RE, '');
const mainContent = (inner) => withoutPages.slice(0, firstBlock) + inner + withoutPages.slice(firstBlock);

// KVKK text for the form pages' pop-up (inert <template>, so it is not part of the page content)
const kvkkArticle = blocks.get('kvkk').match(/<article class="legal" data-legal-src="kvkk">[\s\S]*?<\/article>/)[0]
  .replace(' data-legal-src="kvkk"', '');

function head(html, page, { noindex = false } = {}) {
  const url = SITE + page.path;
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${attr(page.title)}</title>`, 'title');
  html = replaceOnce(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${attr(page.description)}">`, 'description');
  html = replaceOnce(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${attr(page.title)}">`, 'og:title');
  html = replaceOnce(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${attr(page.description)}">`, 'og:description');
  html = replaceOnce(html, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${attr(page.title)}">`, 'twitter:title');
  html = replaceOnce(html, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${attr(page.description)}">`, 'twitter:description');
  if (noindex) {
    html = replaceOnce(html, /<link rel="canonical" href="[^"]*">/, '<meta name="robots" content="noindex">', 'canonical');
    html = replaceOnce(html, /<meta property="og:url" content="[^"]*">\n/, '', 'og:url');
  } else {
    html = replaceOnce(html, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`, 'canonical');
    html = replaceOnce(html, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`, 'og:url');
  }
  if (page.crumb) {
    const crumbs = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Ana sayfa', item: SITE + '/' },
        { '@type': 'ListItem', position: 2, name: page.crumb, item: url }
      ]
    };
    html = replaceOnce(html, /<\/head>/, `<script type="application/ld+json">${JSON.stringify(crumbs)}</script>\n</head>`, '</head>');
  }
  return html;
}

const written = [];
for (const [name, page] of Object.entries(PAGES)) {
  let inner = blocks.get(name).replace(/(<div class="page" data-page="[^"]+")\s+hidden>/, '$1>');
  if (page.legal) inner += `<template data-legal-tpl="kvkk">${kvkkArticle}</template>\n`;
  let html = mainContent(inner);
  html = replaceOnce(html, /<html lang="tr">/, `<html lang="tr" data-route="${name}">`, '<html>');
  html = head(html, page);
  const file = name === 'home' ? 'index.html' : `${name}.html`;
  if ((html.match(/<div class="page" data-page=/g) || []).length !== 1) throw new Error(`${file}: sayfa sayısı 1 değil`);
  writeFileSync(join(OUT, file), html);
  written.push(`${file} (${Math.round(html.length / 1024)} KB)`);
}

let notFound = mainContent(NOT_FOUND + '\n');
notFound = replaceOnce(notFound, /<html lang="tr">/, '<html lang="tr" data-route="404">', '<html>');
notFound = head(notFound, { path: '/404', title: 'Sayfa bulunamadı · Max Efor Danışmanlık', description: 'Aradığınız sayfa bulunamadı.' }, { noindex: true });
writeFileSync(join(OUT, '404.html'), notFound);
written.push('404.html');

const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Object.values(PAGES).map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;
writeFileSync(join(OUT, 'sitemap.xml'), sitemap);
written.push('sitemap.xml');

console.log(`Kaynak: ${SOURCE}\nYazıldı: ${written.join(', ')}`);
