# Build Your Pitch v2.7 — Cloudflare Workers AI Prototype

The existing Build Your Pitch local tools remain unchanged. AI is called only when a student clicks **Polish with AI**.

## Cloudflare Worker setup

1. Create a Cloudflare account and a Worker.
2. Use `worker/src/index.js` as the Worker source.
3. Configure a Workers AI binding named `AI`.
4. Set `ALLOWED_ORIGINS` to the exact origin of the published Build Your Pitch site, such as `https://example.github.io`.
5. Deploy the Worker.
6. Open `/health` on the Worker URL. It should return `ok: true`.
7. In `index.html`, replace `https://YOUR-WORKER.workers.dev/polish` with the Worker `/polish` URL.
8. Publish the updated HTML.

The Worker uses `@cf/google/gemma-4-26b-a4b-it`.

The AI prompt is intentionally narrow: improve flow and grammar without inventing facts. The student reviews the returned version before choosing **Use Polished Version**.

No project database is included.
Cloudflare Worker deployment configured.
