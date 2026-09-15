export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const root = `${url.protocol}//${url.host}`;
  const lines = ["User-agent: *", "Allow: /", `Sitemap: ${root}/sitemap.xml`];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
