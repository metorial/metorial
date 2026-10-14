# Sendloop integration

This integration uses Sendloop's documented API v3 over HTTPS. Each request sends an API key in form-encoded POST data and requests JSON responses.

## Authentication and routing

Create an API key in Settings > API Settings. Account information resolves the account subdomain during connection setup. Existing connections can continue using their stored account subdomain. Account profiles use the nested AccountInfo response.

## Supported workflows

- Read account information and discover subscriber lists and campaigns.
- Create, update, and delete lists; manage existing custom fields and segments.
- Subscribe or unsubscribe individual email addresses, search across lists, browse list subscribers, and update custom field values.
- Import multiple subscribers into a list and inspect imported, duplicate, and failed counts.
- Create campaign drafts with sender details, content, and recipient lists; update campaign settings or delete campaigns.
- Send immediately or schedule delivery using send_campaign with sendDate set to NOW or YYYY-MM-DD HH:mm:ss. Pause, resume, or cancel scheduled delivery.
- Read aggregate campaign open statistics and paginated click, bounce, unsubscription, forward, and open-location data.
- Read overall list performance statistics and manage the global suppression list.

Existing tool keys and field types remain available. Custom field maps accept numeric IDs and CustomField-prefixed keys. Cross-list subscriber searches return subscriber IDs together with list IDs and names. The browse startIndex is a zero-based page index, with 100 subscribers per page. Campaign event data uses one-based page and limit (maximum 50, default 10).

Campaign creation uses the documented version 2 contract. The legacy scheduleType and scheduleDateTime fields remain in the input schema, but unsupported scheduling inputs return an actionable error before any write. Schedule delivery through send_campaign. Campaign update does not claim to update email content through the settings-only update endpoint.

## API sources and verification limits

The provider links its [help portal](https://chmyos.notion.site/Sendloop-Help-Portal-a764b531e9c54f708ca8ebc2de44cc45) from [Sendloop](https://sendloop.com/). API references used for the refresh:

- [API introduction](https://chmyos.notion.site/Introduction-eb743571f7344550b62e51a56cc377cc)
- [Account info](https://chmyos.notion.site/Get-Account-Info-c0ed6e74d95c47609b92225643c5415b)
- [Import subscribers](https://chmyos.notion.site/Import-Subscribers-eb12e964eb804901a180f084a2c77c0c)
- [Subscribe](https://chmyos.notion.site/Subscribe-an-Email-Address-24b06739a31c42a199d8888984bb7b1b)
- [Create campaign v2](https://chmyos.notion.site/Create-a-Campaign-v2-0-937e18e29f374c7da5233e1762f81526)
- [Send campaign](https://chmyos.notion.site/Send-a-Campaign-16a56fe9ff454204b2d8bf81b500f8ca)
- [List performance report](https://chmyos.notion.site/Get-Report-for-a-List-33edfe021ada47ba8d1d90b769a457ed)

No live provider verification was performed for this refresh. Existing custom-field creation/deletion, segment commands, list deletion, and list notification fields were retained; these commands or fields are not described in the currently linked API reference. Their runtime behavior remains unverified.
