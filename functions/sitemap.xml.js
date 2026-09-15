import { CHANNELS } from "./_data.js";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const root = `${url.protocol}//${url.host}`;
  const urls = [`${root}/`, ...CHANNELS.map((c) => `${root}/kanaal/${c.id}`)];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `<url><loc>${u}</loc></url>`),
    "</urlset>",
  ].join("\n");
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
