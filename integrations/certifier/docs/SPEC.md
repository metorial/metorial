# Certifier integration

The integration uses Certifier's JSON REST API at `https://api.certifier.io/v1` with a dashboard access token in `Authorization: Bearer <token>` and the required `Certifier-Version: 2022-10-26` header. Connection configuration is empty. Tokens are not OAuth tokens and do not have a refresh flow in this integration.

## Credentials

- `create_credential` creates a draft, or creates, issues, and sends it when `issueAndSend` is true.
- `get_credential` retrieves the credential's recipient, status, dates, and custom attributes.
- `update_credential` updates provided recipient, date, and custom attribute fields. Recipient edits require the existing recipient ID; the tool resolves it by reading the credential. An explicit `recipientId` can link an existing recipient. When selecting a different ID, provide the target `recipientName` and optionally `recipientEmail`; omitted identity details are never copied from the previous recipient. Dates use YYYY-MM-DD; null expiry resets expiry according to Certifier's behavior.
- `delete_credential` permanently deletes a credential.
- `issue_credential` issues a draft and optionally sends it. These are separate operations: after a send failure, use `send_credential` to retry delivery without reissuing.
- `send_credential` sends or resends an issued credential using its credential template's email configuration. A successful call sends another email.
- `search_credentials` supports nested recipient filters, arrays for AND/OR/NOT, documented sorting, and cursor pagination. UUID and enum filters support equals/in; date and timestamp filters support equals/lt/lte/gt/gte.
- `get_credential_designs` retrieves ordered rendered designs and provides available PNG/PDF downloads. Returned files are immutable snapshots; fetch again after changing a design or displayed attribute.

Credentials without an email can have a null recipient object. Their display name is read from the credential's `recipient.name` attribute. Recipient edits require a linked recipient ID. Existing custom attribute input/output fields retain their string-valued contract.

## Credential templates and designs

The API is renaming groups to credential templates without changing `/groups` routes or existing tool keys.

- `create_group`, `get_group`, `update_group`, `delete_group`, and `list_groups` manage credential templates.
- Use `list_designs` and `get_design` to discover certificate/badge designs made in the Certifier dashboard.
- `create_group` accepts ordered `designIds` with at least one ID, or the existing `certificateDesignId`/`badgeDesignId` fields. Do not combine the two shapes.
- `update_group.designIds` replaces the entire ordered design list. Omitted fields remain unchanged.
- Group results expose `designIds`. The legacy certificate/badge output fields are null when Certifier omits them; consult `designIds` for the actual design list.

## Credential interactions

`create_credential_interaction` records a documented engagement event with recipient/guest attribution and an ISO 8601 timestamp. `list_credential_interactions` lists events for a credential. Its existing `name` and `type` fields contain the provider's `eventType`, and `createdAt` contains `triggeredAt`; credential ID and actor are also returned.

## Pagination, failures, and scope

Paginated tools accept a whole-number limit from 1 to 100, defaulting to 20. Follow `nextCursor` until null; absent provider pagination produces null cursors. Requests use the documented version header, encode path IDs, and expose structured provider failures including Certifier's error code. Automatic write retries are not performed.

The current public REST reference has no account/self/profile endpoint. The package registers no triggers. Webhook subscription management and unsupported bulk workflows are not exposed.

## Official references

- [Quickstart](https://developers.certifier.io/docs/api-reference/quickstart)
- [API reference](https://developers.certifier.io/docs/api-reference)
- [Pagination](https://developers.certifier.io/docs/api-reference/pagination)
- [Credential templates](https://developers.certifier.io/docs/api-reference/credential-templates/create-a-credential-template)
- [Credential renderings](https://developers.certifier.io/docs/api-reference/credentials/get-credential-design-templates)
