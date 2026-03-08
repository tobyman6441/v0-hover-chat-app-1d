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

## 5. Hover Webhook API Reference (for implementation)

Use this when implementing or debugging webhook flows. All endpoints require `Authorization: Bearer {access_token}` (org’s Hover token).

| Action | Method | Endpoint | Docs |
|--------|--------|----------|------|
| **Webhooks overview** | — | — | [Webhooks](https://developers.hover.to/reference/webhooks) |
| **Available events** | — | — | [Hover's available webhook events](https://developers.hover.to/docs/hovers-available-webhooks) |
| **List webhooks** | GET | `https://hover.to/api/v2/webhooks` | [List Webhooks](https://developers.hover.to/reference/list-webhooks) |
| **Register webhook** | POST | `https://hover.to/api/v2/webhooks` | [Register Webhook](https://developers.hover.to/reference/register-webhook) |
| **Verify webhook** | PUT | `https://hover.to/api/v2/webhooks/{webhook_verification_code}/verify` | [Verify Webhook](https://developers.hover.to/reference/verify-webhook) |
| **Delete webhook** | DELETE | `https://hover.to/api/v2/webhooks/{webhook_id}` | [Delete Webhook](https://developers.hover.to/reference/delete-webhook) |
| **Resend verification** | POST | `https://hover.to/api/v2/webhooks/{webhook_id}/request_verification` | [Resend Webhook Verification Code](https://developers.hover.to/reference/resend-webhook-verification-code) |

- **Register** body: `{ "webhook": { "url": "https://YOUR_DOMAIN/api/hover/webhook", "content-type": "json" } }`.
- After register, Hover POSTs `event: "webhook-verification-code"` to your URL with `code` and `webhook_id`; your app must call **Verify** with that `code` to activate the webhook.
- **List webhooks** returns `results[]` with `id`, `url`, `verified_at`, `last_error`, etc., for the authenticated org.

## 6. Testing webhooks

### Step 1: Confirm the webhook is registered and verified

- **From your app:** After calling `POST /api/hover/webhook/register`, check the response for `webhookId` and `success: true`. If verification succeeded, the handler returned 200 to Hover and the webhook is active.
- **From Hover’s API:** Call **List Webhooks** to see your webhook and its status:
  ```bash
  curl -s -H "Authorization: Bearer YOUR_ACCESS_TOKEN" "https://hover.to/api/v2/webhooks"
  ```
  In the `results` array, find your URL; check `verified_at` is non-null (verified) and `last_error` is null. If `last_error` is set, Hover is recording failures when sending events to your URL.

### Step 2: Send a test event to your handler (optional)

You can POST a fake `instant-design-image-created` payload to your webhook URL to confirm the handler runs and writes to the DB. Use a real `org_id`, `lead_id` that exists in your `leads` table (with that `hover_lead_id`), and any numeric `image_id`/`job_id`:

```bash
curl -X POST "https://YOUR_DOMAIN/api/hover/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "instant-design-image-created",
    "webhook_id": 17885,
    "lead_id": 12345,
    "image_id": 99999,
    "job_id": 67890,
    "project_id": 719829,
    "project_name": "Test",
    "timestamp": "2025-06-26T20:16:20.000Z"
  }'
```

- Replace `YOUR_DOMAIN` with your app’s origin (or ngrok/tunnel URL in local dev).
- Replace `lead_id` with a Hover lead ID that exists in your `leads` table as `hover_lead_id`.
- Expect `{"received":true}`. Then in your app, open that lead’s detail page: if the handler ran and the org was resolved, you should see a row in `lead_instant_design_images` for that lead. The “Saved designs” section may still show no image if the Show API fails for the fake `image_id`/`job_id`, but the webhook path is verified.

### Step 3: End-to-end test with a real Instant Design image

1. In Hover, have a lead (that you’ve synced to your app via List Instant Design Leads / backfill) create or save an Instant Design image.
2. Hover will send an `instant-design-image-created` POST to your webhook URL.
3. In your app:
   - Open **Marketing → that lead’s detail page** and click **Refresh** in the Saved designs section. You should see the new image if the webhook wrote to `lead_instant_design_images` and the Show Instant Design Image API succeeds.
   - In Supabase (or your DB), check `lead_instant_design_images` for a row with that `lead_id` and `image_id`, and optionally `webhook_events` for a log entry.

If Step 1 shows verified and no `last_error`, but Step 3 doesn’t show the image, check server logs for `[Hover webhook]` errors (e.g. org lookup, upsert failure) and confirm the lead in Hover matches a lead in your app (same `hover_lead_id`).

## 7. References

- [Hover: Webhooks (overview)](https://developers.hover.to/reference/webhooks)
- [Hover's available webhook events](https://developers.hover.to/docs/hovers-available-webhooks)
- [Leveraging Hover's Webhooks](https://developers.hover.to/docs/leveraging-hovers-webhooks)
- [Register Webhook](https://developers.hover.to/reference/register-webhook)
- [Verify Webhook](https://developers.hover.to/reference/verify-webhook)
- [Instant Design Images webhook](https://developers.hover.to/docs/hovers-available-webhooks#instant-design-images)
