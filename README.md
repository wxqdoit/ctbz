# ctbz

## A2MCP

- Standalone Worker config: `wrangler.a2mcp.jsonc`
- MCP endpoint: `/mcp`
- Free tool: `ctbz_assessment_meta`
- Paid tools: `ctbz_draw_questions`, `ctbz_score_assessment`
- Payment: `0.05 USDT` on `eip155:196`
- payTo: `0xdbe72d90b4a2e99c90c9a11e284bac1ea71d227d`
- Charge points: `ctbz_draw_questions`, `ctbz_score_assessment`
- Management storage: Cloudflare D1 binding `DB` with Drizzle ORM
- Web admin route: `/#admin`

Required Cloudflare secrets:

```bash
wrangler secret put ADMIN_TOKEN --config wrangler.a2mcp.jsonc
wrangler secret put OKX_API_KEY --config wrangler.a2mcp.jsonc
wrangler secret put OKX_SECRET_KEY --config wrangler.a2mcp.jsonc
wrangler secret put OKX_PASSPHRASE --config wrangler.a2mcp.jsonc
```

Optional variables:

- `OKX_BASE_URL` defaults to `https://web3.okx.com`
- `OKX_SYNC_SETTLE` accepts `true` or `false`

Before deploy, replace the placeholder `database_id` in `wrangler.a2mcp.jsonc` with the real D1 database id.

Apply D1 migrations:

```bash
pnpm a2mcp:migrations:apply:local
pnpm a2mcp:migrations:apply
```

Management API:

```text
GET    /admin/config
PATCH  /admin/config
GET    /admin/tools
PATCH  /admin/tools/:name
GET    /admin/calls
GET    /admin/ai-providers
POST   /admin/ai-providers
POST   /admin/ai-providers/models
PATCH  /admin/ai-providers/:id
DELETE /admin/ai-providers/:id
GET    /admin/questions
POST   /admin/questions
PATCH  /admin/questions/:id
DELETE /admin/questions/:id
```

All `/admin/*` routes require:

```text
Authorization: Bearer <ADMIN_TOKEN>
```

Tool config patch body:

```json
{
  "enabled": true,
  "paid": true,
  "price": "0.05",
  "scheme": "exact",
  "network": "eip155:196",
  "payTo": "0xdbe72d90b4a2e99c90c9a11e284bac1ea71d227d"
}
```

AI provider body:

```json
{
  "provider": "openai-compatible",
  "name": "OpenAI Compatible",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "model": "gpt-4o-mini",
  "status": "active",
  "note": "",
  "sortOrder": 0
}
```

Question body:

```json
{
  "category": "组织与制度",
  "text": "你们的流程更接近哪种？",
  "dimension": "organization",
  "enabled": true,
  "sortOrder": 0,
  "options": [
    { "id": "A", "label": "流程清楚，责任明确", "score": 3 },
    { "id": "B", "label": "大体清楚，偶尔补救", "score": 2 },
    { "id": "C", "label": "靠人推进，文档缺失", "score": 1 },
    { "id": "D", "label": "没人知道该找谁", "score": 0 }
  ]
}
```

Web admin:

```text
http://127.0.0.1:5173/#admin
```

The deployed API base defaults to:

```text
https://api.ctbz.lol
```

Commands:

```bash
pnpm build
pnpm test
pnpm worker:dry-run
pnpm worker:dev
pnpm worker:deploy
pnpm a2mcp:dry-run
pnpm a2mcp:dev
pnpm a2mcp:deploy
```
