# DocuPost integration reference

## Authentication

Use an API token from the DocuPost Developer page. Requests include `api_token` in the query string, as required by the [token guide](https://help.docupost.com/developer-documentation/generate-api-token). The connection stores the existing `token` field; no configuration values or OAuth flow are required. Token creation and revocation remain dashboard operations.

## Tools

- `send_letter`: POST to `/api/1.1/wf/sendletter`. Supply exactly one of `pdfUrl` and `html`. HTML goes in the JSON body; addresses and printing options go in query parameters. Certified service uses first-class mail. Choose at most one return-envelope option. Existing field types, optionality, mail-class values, and limits are preserved.
- `send_postcard`: POST to `/api/1.1/wf/sendpostcard`. Supply sender/recipient addresses and front/back image URLs. The API guide specifies 1875 by 1275 images, recommends PNG, and lists `4x6` and `6x9` sizes.
- `get_account_balance`: preserves the original POST `/api/1.1/wf/getbalance` request. This route is not documented in the current public API guide and has not been verified against a provider account. Use the dashboard Funds section if it is unavailable. The existing `balance` field retains the actual nested balance value, including null or zero, when present; otherwise it retains the complete provider result. `response` always retains the actual result.

The send tools return `status` from the provider's top-level string status, when present. Otherwise `status` is the actual HTTP code as text. The additive `httpStatus` exposes the numeric HTTP code, and the existing `response` contains the complete actual API response. No mail identifiers, costs, or delivery states are fabricated. A completed HTTP request does not confirm printing or delivery. Failures use safe messages without echoing tokens, recipient details, or document content. A timed-out mailing may still have been accepted: check the dashboard before retrying.

## API boundaries

Current developer documentation describes letter and postcard submission, but provides no response-field schema or documented API routes for listing/retrieving mail jobs, cancellation, account identity, address books, webhooks, or file exports. Those capabilities were not inferred from dashboard features. Existing balance behavior is retained rather than declared invalid because its route is absent from the current guide.

Track mail and cancel eligible submissions from their detail pages in the dashboard. Cancellation availability varies and is not guaranteed. Export PDFs or CSVs and manage address-book entries in the dashboard. No downloadable-result tool or event trigger is registered.

## Official references

- [Send Letter API](https://help.docupost.com/developer-documentation/send-letter-api)
- [Send Postcard API](https://help.docupost.com/developer-documentation/send-postcard-api)
- [Track Sent Letters](https://help.docupost.com/letters/track-sent-letters)
- [Cancel Sent Letter](https://help.docupost.com/letters/cancel-sent-letter)
- [Manage Recipients](https://help.docupost.com/address-book/manage-recipients)
- [Export Data](https://help.docupost.com/data-and-legal/export-data)

Only static and local verification was performed for this refresh. No operational provider requests or paid mail submissions were made.
