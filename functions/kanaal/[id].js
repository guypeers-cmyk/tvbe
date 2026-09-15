import { renderIndexPage, renderNotFoundPage } from "../_render.js";
import { CHANNELS } from "../_data.js";

export async function onRequestGet({ request, params }) {
  const channelId = params.id;
  const exists = CHANNELS.some((c) => c.id === channelId);
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;

  if (!exists) {
    const html = renderNotFoundPage({ origin });
    return new Response(html, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const html = renderIndexPage({ origin, openChannelId: channelId });
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
