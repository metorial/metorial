# Deadline Funnel Integration

## Authentication

Existing REST operations retain API-key authentication using `Authorization: Bearer {api_key}` at `https://app.deadlinefunnel.com/api/v1`. No OAuth scopes or refresh token are used. Configuration is empty, with no duplicate auth properties or required resource IDs.

The public Deadline Funnel help center does not provide a reference confirming this REST authentication mechanism, base URL, routes, response shapes, pagination, or a current-user endpoint. These legacy operations remain available for compatibility; their acceptance has not been verified.

## Tools

| Tool | Purpose |
| --- | --- |
| `list_campaigns` | Return campaigns and their IDs from the existing account REST operation. Missing or malformed required campaign fields cause a clear error. |
| `start_deadline` | Submit an email and optional first name to the existing campaign deadline REST operation. Use `list_campaigns` to discover the campaign ID. |
| `track_purchase` | Submit an email, purchase amount, currency, and optional first name to the existing campaign sales REST operation. |
| `create_custom_event` | Submit an event name, email, and optional contact name to the existing custom-event REST operation. |
| `start_deadline_webhook` | Submit a subscriber email to a campaign's documented custom webhook. |

## Documented custom webhook workflow

1. Open the campaign editor and select **Emails → Custom API**.
2. Copy the private HTTPS webhook URL, with the pattern `https://code.deadlinefunnel.com/listener/{campaign}/custom/{secret}`.
3. Call `start_deadline_webhook` with that URL and the subscriber email.
4. The tool sends a POST with a URL-encoded `email` field as a plain-text body. It sends no API-key authorization header and does not follow redirects.
5. Confirm the new tracking record in campaign Analytics. HTTP acceptance is reported separately from tracking-record creation.
6. Use Deadline Funnel email links in campaign emails to connect the subscriber's email to their browser and deadline.

The webhook tool accepts only the documented Deadline Funnel host and custom-listener path. It does not accept a sales webhook: purchase values are configured separately in **Sales Tracking Setup**.

## Capability limits

The help center documents custom-event setup in the dashboard and sales tracking through campaign-specific webhooks or automation services. It does not establish a public REST contract for account/profile discovery, portal CRUD, event listing, form-submission listing, or webhook subscription management. No endpoints have been guessed for those capabilities, and no outbound triggers are registered.

## Official references

- [Custom Webhook Integration](https://docs.deadlinefunnel.com/en/articles/4429309-custom-webhook-integration)
- [Make.com integration](https://docs.deadlinefunnel.com/en/articles/11132731-how-to-integrate-deadline-funnel-with-make-com)
- [Sales Tracking](https://docs.deadlinefunnel.com/en/articles/4160232-how-to-set-up-sales-tracking-in-deadline-funnel)
- [Sales Tracking with Custom API](https://docs.deadlinefunnel.com/en/articles/12166196-how-to-set-up-sales-tracking-in-deadline-funnel-with-custom-api)
- [Custom Events for Portal Social Proof](https://docs.deadlinefunnel.com/en/articles/6362084-how-to-create-custom-events-to-display-in-portal-s-social-proof)
