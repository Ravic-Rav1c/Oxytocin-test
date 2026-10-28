/**
 * Cloudflare Pages · 高级模式（Advanced Mode）单文件接口
 *
 * 为什么用这个：`functions/` 目录在你的仓库里没能被编译生效（复测 /api/export 仍返回页面 HTML）。
 * `_worker.js` 只需要放在**站点根目录**（与 index.html 同级），Pages 会把它当作入口 Worker，
 * 比 functions 目录更不容易踩路径问题。
 *
 * 用法：
 *   1) 仓库根目录新增文件 `_worker.js`，粘贴本文件全部内容
 *   2) 若已存在 `functions/` 目录，**删掉它**（两者不能同时使用）
 *   3) 提交后等 Pages 重新部署
 *   4) 接口路径不变：POST /api/result、GET /api/export?token=...
 *
 * 依赖：
 *   · KV 绑定名 `KV_BINDING`（Pages 项目 Settings → Functions → KV namespace bindings）
 *   · 环境变量 `EXPORT_TOKEN`
 *   · env.ASSETS 由 Pages 自动注入，用于回落到静态文件
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/api/result" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch (e) {
        return json({ ok: false, error: "bad json" }, 400, cors);
      }
      const kv = env.KV_BINDING || env.RESULTS;
      if (!kv) return json({ ok: false, error: "KV binding missing: 需要 KV_BINDING" }, 500, cors);
      const key = new Date().toISOString().replace(/[:.]/g, "-") + "-" + Math.random().toString(36).slice(2, 8);
      await kv.put(key, JSON.stringify(body), {
        metadata: { sid: body.sid || "", endReason: body.endReason || "" }
      });
      return json({ ok: true, id: key }, 200, cors);
    }

    if (url.pathname === "/api/export" && request.method === "GET") {
      const token = url.searchParams.get("token") || "";
      if (!env.EXPORT_TOKEN || token !== env.EXPORT_TOKEN) {
        return new Response("forbidden", { status: 403, headers: cors });
      }
      const kv = env.KV_BINDING || env.RESULTS;
      if (!kv) return new Response("KV binding missing", { status: 500, headers: cors });
      const limit = Math.min(1000, parseInt(url.searchParams.get("limit") || "1000", 10) || 1000);
      const list = await kv.list({ limit });
      const rows = [];
      for (const k of list.keys) {
        const v = await kv.get(k.name);
        rows.push({ key: k.name, data: JSON.parse(v) });
      }
      return json(rows, 200, cors);
    }

    // 其它路径：交给 Pages 的静态资源
    if (env.ASSETS && env.ASSETS.fetch) return env.ASSETS.fetch(request);
    return new Response("not found", { status: 404, headers: cors });
  }
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
  });
}
