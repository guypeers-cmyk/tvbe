import { enrichChannel } from "../../../_render.js";
import { CHANNELS } from "../../../_data.js";

export async function onRequestGet({ params }) {
  const ch = CHANNELS.find((c) => c.id === params.id);
  if (!ch) {
    return new Response(JSON.stringify({ error: "not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
  return new Response(JSON.stringify(enrichChannel(ch)), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
