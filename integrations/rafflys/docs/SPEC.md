# Rafflys integration

Retrieve account and promotion lead information from Rafflys (AppSorteos).

## Connection

Connect with the Rafflys API key from your account settings. Requests use the
`X-API-KEY` header against `https://app-sorteos.com/api/v2`. The connection
profile uses the same `/users/me` request and validation as Get Current User.
No additional configuration, OAuth scopes, or token refresh is required.

## Tools

| Tool key | Behavior |
| --- | --- |
| `get_current_user` | Read `/users/me`, returning the account ID, available name/email, and unchanged raw profile. |
| `list_promotions` | Read `/promotions`, returning promotion IDs and names. |
| `get_promotion_leads` | Read `/promotions/{promotionId}/leads`, returning lead IDs, available contact/timestamp fields, and unchanged additional fields. Call `list_promotions` to discover promotion IDs. |

All tools are read-only. IDs from numeric API responses remain strings in the
existing public outputs. The existing direct-array and `data`-array response
forms are retained. Required IDs and promotion names must exist; malformed
responses produce a clear service error. Optional strings remain omitted when
absent. No synthetic IDs, names, timestamps, or collections are returned.

The existing lead mapping reads the `created` timestamp and the `email`,
`firstName`, `lastName`, `fullName`, and `phone` contact fields. Other fields,
including differently named provider fields, remain in `additionalFields`.
This integration exposes no campaign creation, winner selection, certificate
generation, file export, or automatic lead trigger.

## Documentation and limits

The official [promotion dashboard guide](https://hc.app-sorteos.com/help/a/accediendo-a-tu-dashboard-mis-promociones)
and [lead guide](https://hc.app-sorteos.com/help/a/mis-leads-registros-de-tus-promociones)
describe the promotion and lead product model. The official
[Zapier integration guide](https://app-sorteos.com/es/blog/integraciones-zapier)
describes forwarding newly collected leads to other apps. These articles do not
publish the API endpoint schemas or pagination contract.

The existing three endpoint paths and API-key header are retained for
compatibility. Detailed endpoint authentication, field names, optional/null
behavior, and pagination could not be independently confirmed against a public
official API reference during this refresh. No additional endpoints or guessed
pagination parameters were added. Provider runtime behavior requires separate
credentialed verification.
