import { renderIndexPage } from "./_render.js";

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const html = renderIndexPage({ origin, openChannelId: null });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
