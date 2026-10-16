# Page X API specification

This integration submits leads to PageXCRM through the provider's [published RapidAPI API](https://rapidapi.com/thunderhurt/api/pagexcrm). The published API version contains one endpoint: `POST https://pagexcrm.p.rapidapi.com/api/lead`.

## Authentication

Provide the PageXCRM API key from [Integrations > API](https://www.pagexcrm.com/plugins/api) and a RapidAPI key subscribed to PageXCRM. Requests send the PageXCRM key in `api_key`, the RapidAPI key in `x-rapidapi-key`, and `x-rapidapi-host: pagexcrm.p.rapidapi.com`.

## Create lead

The `create_lead` tool retains its existing required `name` and `email` string inputs. The provider documents those fields, `phone`, `plat`, `customer_id`, and `more` as optional, with at least one lead value required. For compatibility, this tool keeps the existing name/email requirements without requiring nonempty contact strings. Any nonblank name, email, phone, customer identifier, source platform or country, or a nonempty custom detail object, permits submission. Only a request with all these fields blank/absent and no custom details is rejected.

| Tool field | Provider field | Behavior |
| --- | --- | --- |
| `customerId` | `customer_id` | Optional external customer identifier for the lead; falls back to the optional configuration value. It is not an account identifier required to authenticate. |
| `name`, `email`, `phone` | Same names | Lead contact details. |
| `platform` | `plat` | Source platform, such as a website or advertising platform. |
| `more` | `more` | Custom detail object, matching the provider's example with company/source keys. The prose calls this an array; the published example is an object. |
| `country` | `more.country` | Preserved country input delivered through documented custom details. Conflicting `country` and `more.country` values are rejected. |

The request uses a JSON object matching the provider's published request example. The provider does not explicitly declare a request media type in the public documentation; live request acceptance has not been verified.

The documented success response is an object with `status: "success"` and a string `message`. Only that response shape confirms success. Error status bodies, HTTP/network failures and malformed responses raise a service error. The tool retains `success` and optional `rawResponse` outputs; the complete success object is preserved with only API credentials redacted from echoed fields, keys or strings. No provider lead ID is fabricated because the success example contains none.

## Capability boundary

No current-user/account identity, list/read/update/delete lead, download, or webhook-registration endpoint appears in the published version inventory. No endpoint is invented for those operations. The [provider website](https://pagexcrm.com/) advertises broader product functionality and webhooks; that product claim does not supply an API contract for additional tools or triggers.
