# 部署包：GitHub → Cloudflare Pages（同域接口）

> 为什么走这条：你的网络访问不到 `*.workers.dev`（你和我都连不上 `workers.dev` 根域）。
> 这个方案把**页面和接口放在同一个 `*.pages.dev` 域名下**，走相对路径 `/api/result`，不碰 workers.dev，也不需要跨域。
>
> 状态：文件与语法已在本机校验；**真实部署未验证**（本机无你的 GitHub/Cloudflare 账号）。

---

## 目录内容（整包就是要上传到仓库的东西）

```
index.html                前端（SUBMIT_URL 已设为相对路径 /api/result）
bgm.flac                  背景音乐 16.6MB / 2:46
functions/api/result.js   POST /api/result → 写 KV
functions/api/export.js   GET  /api/export?token=... → 导出 JSON
```

---

## 一、传到 GitHub（网页操作，不需要命令行）

1. GitHub 新建一个仓库，例如 `oxytocin-test`（Public / Private 都行）
2. 仓库首页 → **Add file → Upload files**
3. 把本目录里的 `index.html`、`bgm.flac`、`functions` 文件夹**一起拖进去**（拖文件夹会保留 `functions/api/` 结构）
4. 点 **Commit changes**

> `bgm.flac` 16.6MB 在 GitHub 网页单文件 25MB 限制内，可以直接传。

## 二、Cloudflare Pages 连仓库

1. Cloudflare → Workers & Pages → **Create → Pages → Connect to Git**
2. 授权并选择刚建的仓库、分支 `main`
3. 构建设置：
   - Framework preset：**None**
   - Build command：留空（或填 `exit 0`）
   - Build output directory：**`/`**
4. **Save and Deploy**，等 1–2 分钟，得到 `https://<项目名>.pages.dev`

## 三、绑 KV 与密码（这一步不做接口会报错）

Pages 项目 → **Settings → Functions → KV namespace bindings**
- Variable name：**`KV_BINDING`**（必须一字不差）
- KV namespace：选你已有的 `results` 那个（ID `b9de7a082e8d4a4d861ca44946b48d8e`）
- Save

Pages 项目 → **Settings → Environment variables**
- 添加 `EXPORT_TOKEN` = 你想要的导出密码 → Save

⚠️ 加完绑定/变量必须**重新部署**才生效：Deployments → 最新一条 → 右侧 **Retry deployment**（或改一行重新 commit）。

## 四、验证顺序（照顺序做，出错好定位）

1. 打开 `https://<项目名>.pages.dev/` → 页面正常，点开始能听到 BGM
2. 打开 `https://<项目名>.pages.dev/api/export?token=你的密码` → 期望 `[]`
3. 玩一局到结束 → 点「提交结果」→ 应显示「已提交，感谢你的参与！」
4. 再打开第 2 步的地址 → 应看到 1 条记录
5. 手机（微信内）打开链接再走一遍

## 五、之后改文案怎么更新

改 `deploy-pages/index.html` → 在 GitHub 上重新上传/编辑该文件 → Pages 自动重新部署（不用改任何配置）。

## 六、排错表

| 现象 | 原因 / 处理 |
|---|---|
| 页面 404 | Build output directory 不是 `/`，或文件没传到仓库根目录 |
| `/api/export` 返回页面 HTML | `functions/` 没上传成功，或不在仓库根目录（必须与 index.html 同级） |
| `KV binding missing` | Settings 里变量名不是 `KV_BINDING`，或加完没重新部署 |
| `forbidden` | `EXPORT_TOKEN` 没设 / URL 里 token 不一致 |
| 提交 Failed to fetch | 多半是页面与接口不同域（检查 `SUBMIT_URL` 是否为 `/api/result`） |
| 提交后导出没有记录 | KV 最终一致，等几秒；仍没有就看 Worker 日志（Pages → Functions → 实时日志） |

## 七、注意

- `EXPORT_TOKEN` 已设过 `040520` 并在聊天里出现过，建议换成新的。
- 不要把含密码的配置文件提交到公开仓库；本方案里没有密码文件，密码只放在 Pages 环境变量。
