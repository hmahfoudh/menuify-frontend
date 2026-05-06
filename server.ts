import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the tenant subdomain from the incoming request.
 * Caddy forwards the original host via X-Forwarded-Host or X-Original-Host.
 * Falls back to parsing the Host header directly when running locally.
 */
function resolveTenantSubdomain(req: express.Request): string | null {
  const host =
    (req.headers['x-original-host'] as string) ||
    (req.headers['x-forwarded-host'] as string) ||
    req.headers['host'] ||
    '';

  // Strip port if present
  const hostname = host.split(':')[0];

  // Match: <subdomain>.menuify.tn
  const match = hostname.match(/^([^.]+)\.menuify\.tn$/);
  if (match && match[1] !== 'www' && match[1] !== 'api') {
    return match[1];
  }

  return null;
}

// ── App factory ───────────────────────────────────────────────────────────────

export function app(): express.Express {
  const server = express();
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  // ── robots.txt ─────────────────────────────────────────────────────────────
  // Served per-context: different rules for main domain vs tenant subdomains.
  server.get('/robots.txt', (req, res) => {
    const subdomain = resolveTenantSubdomain(req);
    res.set('Content-Type', 'text/plain');

    if (!subdomain) {
      // Main domain — allow landing, block all private routes
      res.send(
        `User-agent: *\n` +
        `Allow: /\n` +
        `Disallow: /dashboard/\n` +
        `Disallow: /admin/\n` +
        `Disallow: /auth/\n` +
        `Sitemap: https://menuify.tn/sitemap.xml\n`
      );
    } else {
      // Tenant subdomain — only the public menu is indexable
      res.send(
        `User-agent: *\n` +
        `Allow: /menu\n` +
        `Disallow: /\n` +
        `Sitemap: https://${subdomain}.menuify.tn/sitemap.xml\n`
      );
    }
  });

  // ── sitemap.xml ────────────────────────────────────────────────────────────
  // Main domain: static sitemap for landing page only.
  // Tenant subdomains: per-tenant sitemap covering the /menu route.
  //
  // For a full sitemap index (all tenants listed on the main domain),
  // proxy to the Spring Boot endpoint: GET /api/public/sitemap-index
  // and expose it at https://menuify.tn/sitemap-index.xml
  server.get('/sitemap.xml', (req, res) => {
    const subdomain = resolveTenantSubdomain(req);
    res.set('Content-Type', 'application/xml');

    if (!subdomain) {
      // Main domain sitemap — landing page only
      res.send(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n` +
        `    <loc>https://menuify.tn/</loc>\n` +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>1.0</priority>\n` +
        `  </url>\n` +
        `</urlset>`
      );
    } else {
      // Tenant subdomain sitemap — /menu is the only public indexable page
      res.send(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url>\n` +
        `    <loc>https://${subdomain}.menuify.tn/menu</loc>\n` +
        `    <changefreq>weekly</changefreq>\n` +
        `    <priority>1.0</priority>\n` +
        `  </url>\n` +
        `</urlset>`
      );
    }
  });

  // ── Static files ───────────────────────────────────────────────────────────
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // ── Angular SSR ────────────────────────────────────────────────────────────
  server.get('*', (req, res, next) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
        ],
      })
      .then((html) => res.send(html))
      .catch((err) => next(err));
  });

  return server;
}

// ── Entry point ───────────────────────────────────────────────────────────────

function run(): void {
  const port = process.env['PORT'] || 4000;
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();