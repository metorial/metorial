# Botbaba API Integration

## Authentication

Use the auth token from Edit Profile in your Botbaba account. Requests send the token directly in the `Authorization` header, without a Bearer prefix. JSON requests use `Content-Type: application/json`.

The [official messaging guide](https://kb.botbaba.io/docs/how-to-forward-a-template-message-with-custom-data-using-botbabas-api-and-postman-runner/) describes obtaining the token and copying a template request from the dashboard.

## Tools

- `list_bots`: retrieve bots from the existing `GET /api/GetBots` endpoint. The integration accepts an array, `bots`/`data` array envelopes, or a single object. The current public guides do not specify this endpoint's response schema.
- `send_whatsapp_template`: preserve the existing mobile number, template name, optional block, and string parameter inputs. Its simplified request uses `mobile`, `template`, `block`, and flattened parameter keys. Those field names are retained for compatibility; their complete provider contract was unavailable during this refresh.
- `send_whatsapp_template_request`: submit the exact JSON object produced by **Copy Send Message Request** in Actions → WhatsApp Users → Broadcast Template Message. Use this for provider-specific template fields rather than reconstructing the body.

The official messaging guide documents `POST /api/SendWhatsAppWAMessages` for 360Dialog and `POST /api/SendWhatsAppTemplateMessages` for Gupshup. The new tool forwards the copied object unchanged and preserves the response, including a null empty response. The simplified tool keeps its object response contract; non-object responses are available under `value`, and an empty response is an empty object.

## Messaging prerequisites

The bot needs a configured WhatsApp Business API integration and an approved template. Recipient numbers include the country code. The [broadcast guide](https://kb.botbaba.io/docs/broadcast-template-message/) describes messages being added to a queue and warns about provider daily quotas. Tool results report submission, not confirmed delivery.

## Documentation limits

Botbaba's guides point to the [public Swagger UI](https://app.botbaba.io/swagger/ui/index), but the specification and request screenshots were unavailable during this refresh. No profile endpoint or additional CRUD payload was verified, so no identity, bot management, or e-commerce tools were added. This does not establish that undocumented endpoints are unavailable.
