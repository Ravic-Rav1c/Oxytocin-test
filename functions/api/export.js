/**
 * Pages Functions 版本 · 导出全部结果（可选方案）
 * 访问：/api/export?token=<EXPORT_TOKEN>
 * 环境变量 EXPORT_TOKEN 在 Pages 项目 Settings → Environment variables 里设。
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!env.EXPORT_TOKEN || token !== env.EXPORT_TOKEN) {
    return new Response("forbidden", { status: 403, headers: { "Access-Control-Allow-Origin": "*" } });
  }
  const kv = env.KV_BINDING || env.RESULTS;
  if (!kv) {
    return new Response("KV binding RESULTS missing", { status: 500 });
  }
  const limit = Math.min(1000, parseInt(url.searchParams.get("limit") || "1000", 10) || 1000);
  const list = await kv.list({ limit });
  const rows = [];
  for (const k of list.keys) {
    const v = await kv.get(k.name);
    rows.push({ key: k.name, data: JSON.parse(v) });
  }
  return new Response(JSON.stringify(rows), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
  });
}
