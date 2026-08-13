# cursor-webui

Vue 3 + Vite + Tailwind + shadcn-vue + Inter PWA for the Cursor OpenAI-compatible gateway.

## Local setup

```powershell
copy .env.example .env
npm install
npm run dev
```

- WebUI: `http://localhost:5178`
- API base: `http://localhost:8130` (`VITE_API_BASE_URL`)
- Login: `armin` / `dopadopa123`

## Pages

| Path | Purpose |
|------|---------|
| `/endpoints` | Live status of gateway / Cursor Cloud endpoints |
| `/api-keys` | Create and revoke gateway API keys for OpenAI SDK clients |

Point the OpenAI SDK at `http://localhost:8130/v1` with a gateway key from **API Keys**.
