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
  server.set('trust proxy', 1);

  // ── robots.txt ─────────────────────────────────────────────────────────────
  // Served per-context: different rules for main domain vs tenant subdomains.
  server.get('/robots.txt', (req, res) => {
    const subdomain = resolveTenantSubdomain(req);
    console.log(`Robots.txt request for: ${req.headers.host} - Subdomain detected: ${subdomain}`);
    res.set('Content-Type', 'text/plain');

    if (!subdomain) {
      // Main domain — allow landing, block all private routes
      res.send(
        `User-agent: *\n` +
        `Allow: /\n` +
        `Sitemap: https://menuify.tn/sitemap.xml\n`
      );
    } else {
      // Tenant subdomain — only the public menu is indexable
      res.send(
        `User-agent: *\n` +
        `Allow: /\n` +
        `Sitemap: https://${subdomain}.menuify.tn/sitemap.xml\n`
      );
    }
  });

  // ── sitemap.xml ────────────────────────────────────────────────────────────
  // Main domain: sitemap INDEX listing the landing page + all tenant sitemaps.
  //   Submit https://menuify.tn/sitemap.xml to Search Console — it covers all.
  //   When adding a new tenant, add one <sitemap> entry here and redeploy.
  // Tenant subdomains: per-tenant urlset covering the /menu route only.
  server.get('/sitemap.xml', (req, res) => {
    const subdomain = resolveTenantSubdomain(req);
    res.set('Content-Type', 'application/xml');

    if (!subdomain) {
      // Sitemap index — one entry per tenant + the main landing page entry
      res.send(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `\n` +
        `  <!-- Main domain landing page -->\n` +
        `  <sitemap>\n` +
        `    <loc>https://menuify.tn/sitemap-main.xml</loc>\n` +
        `  </sitemap>\n` +
        `  <!-- Blog posts -->\n` +
        `  <sitemap>\n` +
        `    <loc>https://menuify.tn/sitemap-blog.xml</loc>\n` +
        `  </sitemap>\n` +
        `\n` +
        `  <!-- Tenant subdomains -->\n` +
        `  <sitemap>\n` +
        `    <loc>https://theridge.menuify.tn/sitemap.xml</loc>\n` +
        `  </sitemap>\n` +
        `  <sitemap>\n` +
        `    <loc>https://theloft.menuify.tn/sitemap.xml</loc>\n` +
        `  </sitemap>\n` +
        `  <sitemap>\n` +
        `    <loc>https://baristabistro.menuify.tn/sitemap.xml</loc>\n` +
        `  </sitemap>\n` +
        `  <sitemap>\n` +
        `    <loc>https://platocoffee.menuify.tn/sitemap.xml</loc>\n` +
        `  </sitemap>\n` +
        `  <sitemap>\n` +
        `    <loc>https://blackrabbit.menuify.tn/sitemap.xml</loc>\n` +
        `  </sitemap>\n` +
        `\n` +
        `</sitemapindex>`
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

  // ── sitemap-main.xml ───────────────────────────────────────────────────────
  // Referenced by the sitemap index above. Contains only the landing page URL.
  server.get('/sitemap-main.xml', (_req, res) => {
    res.set('Content-Type', 'application/xml');
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url>\n` +
      `    <loc>https://menuify.tn/</loc>\n` +
      `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n` +
      `    <changefreq>weekly</changefreq>\n` +
      `    <priority>1.0</priority>\n` +
      `  </url>\n` +
      `</urlset>`
    );
  });

  // ── Static files ───────────────────────────────────────────────────────────
  server.get('*.*', express.static(browserDistFolder, {
    maxAge: '1y'
  }));

  // ── Angular SSR ────────────────────────────────────────────────────────────
  server.get('*', (req, res, next) => {
    const { originalUrl, baseUrl, headers } = req;

    // Use X-Forwarded-Proto if available (set by Caddy), fallback to https
    const protocol =
      (headers['x-forwarded-proto'] as string)?.split(',')[0].trim() ?? 'https';

    // Use the original host from Caddy, not what Express sees
    const host =
      (headers['x-original-host'] as string) ||
      (headers['x-forwarded-host'] as string) ||
      headers['host'] ||
      'menuify.tn';

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${host}${originalUrl}`,
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