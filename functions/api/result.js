/**
 * Cloudflare Pages Functions 版本 · 结果收集（可选方案）
 * 用法：把本 functions/ 目录与 index.html、bgm.flac 一起部署到 Pages，
 *       在 Pages 项目 Settings → Functions → KV namespace bindings 绑定
 *         Variable name: RESULTS
 *      前端把 SUBMIT_URL 写 "/api/result" 即可（同域，无 CORS）。
 * 注意：Pages「直接上传(drag&drop)」是否带 Functions 取决于 wrangler 版本，未验证；
 *       Git 集成的 Pages 项目一定支持。
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "bad json" }, 400);
  }
  const kv = env.KV_BINDING || env.RESULTS;
  if (!kv) {
    return json({ ok: false, error: "KV binding RESULTS missing" }, 500);
  }
  const key = new Date().toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 8);
  await kv.put(key, JSON.stringify(body), {
    metadata: { sid: body.sid || "", endReason: body.endReason || "" }
  });
  return json({ ok: true, id: key }, 200);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
  });
}
