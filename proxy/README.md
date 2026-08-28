# agent-tower classification proxy

A single Cloudflare Worker. It holds the DeepSeek API key so that users of
agent-tower do not need one: `npm start` classifies agents out of the box.

The key lives only in Cloudflare's secret store. It is not in this repository,
not in the npm package, and not on any user's machine.

## Deploy

From the repository root:

```sh
npx wrangler login                             # opens the browser once
npx wrangler deploy --config proxy/wrangler.toml
npx wrangler secret put DEEPSEEK_API_KEY --config proxy/wrangler.toml
```

The second command prints the worker URL. Put it, with the `/classify` path, in
`DEFAULT_PROXY_URL` in `server/config.js` and commit it - the URL is not a
secret, it grants nothing but agent classification.

Check it:

```sh
curl https://<worker>.workers.dev/health
# {"ok":true,"configured":true}
```

`configured: false` means the secret is missing: the worker is up but every
`/classify` call answers 503 without touching DeepSeek. Run the third command.

## Rotating the key

```sh
npx wrangler secret put DEEPSEEK_API_KEY --config proxy/wrangler.toml
```

Takes effect immediately. No release, nothing breaks for existing users.

## What stops abuse

The URL is public, so anyone can call it. They cannot get the key, but they can
spend its quota. Four things keep that boring:

- **The prompt is fixed in the worker.** Callers send a list of agents, never
  messages. `sanitizeItems` whitelists the eight fields the prompt uses and
  drops everything else, so the endpoint cannot be repurposed as a general
  chat model. This is the defence that matters.
- **Batch cap.** 8 agents per request, hard limits on every field length, 32 KB
  body.
- **Rate limit.** 20 requests per minute per IP, in the isolate's memory. Best
  effort - Cloudflare may run more than one isolate.
- **Spend limit on the DeepSeek account.** The only hard ceiling. Set it.

Errors never forward the upstream body, so nothing about the request or the key
can leak through a failure message.

## Cost

Cloudflare's free plan covers 100k requests/day. One tower session is a handful
of requests, and results are cached on the client for 30 days, so DeepSeek is
asked once per distinct agent shape.
