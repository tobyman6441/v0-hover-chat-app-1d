# Hover Webhook Setup (Instant Design Images)

To show **Saved designs** for leads who create Instant Design images in Hover, register the `instant-design-image-created` webhook so Hover notifies your app. Your app then stores `lead_id`, `image_id`, and `job_id`; the Show Instant Design Image API needs `job_id` to return image URLs.

## 1. Prerequisites

- Hover connected in your app (Settings → connect Hover).
- Your app deployed so the webhook URL is reachable by Hover (e.g. `https://your-domain.com/api/hover/webhook`). For local dev, use a tunnel (ngrok, Cloudflare Tunnel, etc.) and use that URL when registering.

## 2. Register the webhook with Hover

You can register in one of two ways.

### Option A: Register from your app (recommended)

Your app has a **register** endpoint. While logged in and with Hover connected:

1. **From the browser console** (on your app origin), run:
   ```js
   fetch('/api/hover/webhook/register', { method: 'POST' }).then(r => r.json()).then(console.log)
   ```
   Or use a “Register webhook” button if your UI exposes one.

2. The app will:
   - Call Hover’s API: `POST https://hover.to/api/v2/webhooks` with body:
     ```json
     { "webhook": { "url": "https://YOUR_DOMAIN/api/hover/webhook", "content-type": "json" } }
     ```
   - Store the returned `webhook_id` for your org (e.g. in `hover_webhook_org`).
3. Hover will immediately send a **verification** POST to your URL with `event: "webhook-verification-code"`. Your handler at `/api/hover/webhook` will:
   - Call Hover’s verify endpoint: `PUT https://hover.to/api/v2/webhooks/{code}/verify` with your org’s Bearer token.
   - After that, the webhook is active and you’ll receive `instant-design-image-created` events.

### Option B: Register via API (curl / Postman)

1. Get an access token for your Hover org (e.g. from your app’s Hover connection).
2. Register the webhook:
   ```bash
   curl -X POST "https://hover.to/api/v2/webhooks" \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"webhook":{"url":"https://YOUR_DOMAIN/api/hover/webhook","content-type":"json"}}'
   ```
3. Save the `webhook_id` from the response. Optionally insert a row in `hover_webhook_org` so events are attributed to your org:
   ```sql
   INSERT INTO hover_webhook_org (webhook_id, org_id) VALUES (12345, 'your-org-uuid');
   ```
4. Hover will POST to your URL with `event: "webhook-verification-code"` and a `code`. Your app’s webhook handler will call Hover’s verify endpoint; ensure the handler is deployed and the URL is reachable so verification succeeds.

## 3. Verification flow (automatic)

When Hover sends the verification request to `/api/hover/webhook`:

1. Your handler receives `event: "webhook-verification-code"`, `webhook_id`, and `code`.
2. It looks up the org (from `hover_webhook_org` by `webhook_id`, or falls back to the first Hover-connected org).
3. It calls `PUT https://hover.to/api/v2/webhooks/{code}/verify` with that org’s Bearer token.
4. If the response is OK, the webhook is active. The handler may also upsert `hover_webhook_org` so future `instant-design-image-created` events are tied to the correct org.

## 4. Event: instant-design-image-created

After the webhook is verified, when a lead creates/saves an Instant Design image in Hover, Hover sends:

```json
{
  "event": "instant-design-image-created",
  "webhook_id": 17885,
  "lead_id": 8675309,
  "image_id": 18921411,
  "job_id": 16741840,
  "project_id": 719829,
  "project_name": "The Big House",
  "timestamp": "2025-06-26T20:16:20.000Z"
}
```

Your handler at `/api/hover/webhook` stores this in `lead_instant_design_images` (org_id, lead_id, image_id, job_id). The lead detail page then loads images from that table and calls the Show Instant Design Image API **with** `job_id`, so image URLs are returned and displayed.

## 5. References

- [Hover: Leveraging Webhooks](https://developers.hover.to/docs/leveraging-hovers-webhooks)
- [Hover: Register Webhook](https://developers.hover.to/reference/register-webhook)
- [Hover: Verify Webhook](https://developers.hover.to/reference/verify-webhook)
- [Hover: Instant Design Images webhook](https://developers.hover.to/docs/hovers-available-webhooks#instant-design-images)
