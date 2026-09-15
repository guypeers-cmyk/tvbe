import { enrichAllChannels } from "../../_render.js";

export async function onRequestGet() {
  const enriched = enrichAllChannels();
  return new Response(JSON.stringify(enriched), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
