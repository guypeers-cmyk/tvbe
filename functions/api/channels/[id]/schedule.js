import { CHANNELS, PROGRAMMES } from "../../../_data.js";

export async function onRequestGet({ params }) {
  const ch = CHANNELS.find((c) => c.id === params.id);
  if (!ch) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  const programmes = ch.epg_id ? PROGRAMMES[ch.epg_id] || [] : [];
  const now = new Date();
  const upcoming = programmes.filter((p) => new Date(p.stop) > now).slice(0, 8);
  return new Response(JSON.stringify(upcoming), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
