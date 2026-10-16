# Thanks.io API capabilities

Thanks.io automates personalized physical postcards, windowed and windowless letters, notecards and gift cards. Connect with a personal access token or OAuth 2.0. Both authenticate using a Bearer token at `https://api.thanks.io/api/v2`.

The integration provides 17 tools:

- Send postcards, letters, notecards and gift cards using inline design settings or a saved creative. Preview mode returns downloadable preview images without placing an order.
- Estimate mailer cost before sending, including balance coverage and the provider's cost breakdown and notes.
- List and read saved creatives, list image/message templates with pagination and type/sub-account filters, and discover handwriting styles and gift card brands.
- Manage mailing lists and their recipients, including bulk recipient creation. Email-only address lookup may incur a fee.
- List, track and cancel orders; inspect individual order items for delivery failures and gift card redemption status.
- Count radius-search matches without buying records, or purchase lead records into a mailing list. Purchases support at most 2500 records, or 5 in API Test Mode.
- Manage sub-accounts and their return addresses. Deleting a sub-account moves orders and lists to the main account and deletes its templates and campaigns.

OAuth uses authorization-code and refresh-token grants at `https://dashboard.thanks.io/oauth/token`. No OAuth scopes or current-account identity endpoint are documented. A personal token is validated with a read-only mailing-list request; a list count is not used as account identity.

Saved creatives cannot be combined with design, message, handwriting, background, PDF-only, or gift card overrides. The provider requires a complete creative of the matching mail type and size. QR code and additional letter PDF pages may be supplied with a creative.

## Official references

- [API documentation](https://docs.thanks.io/)
- [OpenAPI specification](https://raw.githubusercontent.com/thanks-io/thanks.io-api-docs/refs/heads/main/api-reference/openapi.json)
- [OAuth](https://docs.thanks.io/authentication/oauth)
- [Bearer tokens](https://docs.thanks.io/authentication/bearer-token)
- [Cost estimates](https://help.thanks.io/api/estimating-order-cost/)

Provider webhook management is subscription-gated and is not exposed by this integration. No webhook triggers are registered. Creatives are designed in the provider dashboard. The integration does not currently expose message-template editing, magnacard sending, order replay, or gift card invalidation.
