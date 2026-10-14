# PersistIQ Integration Specification

PersistIQ is a sales engagement platform for prospects and outreach sequences. This integration uses the current public REST API at `https://api.persistiq.com/v1`, authenticated using the `x-api-key` header. Find the key under Settings > Integrations > API Key.

## Supported workflows

- Create a prospect with the singular `lead` payload and explicit duplicate handling (`skip` by default, or `update`). An optional creator ID is discoverable through `list_users`.
- List prospects using email, status name/ID, and creation/update timestamp filters. Retrieve a prospect by hashed ID or email address.
- Update prospect contact/custom data, status name/ID, owner, bounce state, and opt-out state in a single PATCH request. Status values and owner IDs are discoverable through `list_lead_statuses` and `list_users`.
- List campaigns with name, owner, and prospect filters. Create a campaign with a name and selected owner, or duplicate an existing campaign for another owner.
- List campaign memberships, add a prospect with an optional sending mailbox, and remove a prospect using its lead ID. Omitting the mailbox uses the campaign owner mailbox. Team user results include mailbox IDs and email addresses.
- List configured prospect fields and statuses. Field output exposes a display label and API key for custom-field writes.
- Add and list Do Not Contact domains. These domains block outreach, including prospects already enrolled in campaigns.

List results expose `hasMore` from the provider's `has_more` flag and the optional `nextPage` continuation value. Page inputs remain numeric. The specification defines integer page inputs and string continuations without explaining their conversion or starting index; callers should preserve the returned continuation and verify pagination behavior in their account.

The existing `delete_campaign` key remains for compatibility. The current reference does not document campaign deletion; provider support for its legacy endpoint is unverified.

The API exposes all team users but no documented current-user or account identity endpoint. Authentication validates the key through the user list without attributing it to the first team member.

## Sources and verification limits

- [Official API documentation](https://api.persistiq.com/api-docs)
- [Official OpenAPI specification](https://api.persistiq.com/api-docs/v1/swagger.json)
- [Do Not Contact domain behavior](https://help.persistiq.com/en/articles/806003-do-not-contact-domains)

Payloads and response mapping were audited against the current official OpenAPI specification. Provider acceptance and account permissions were not verified live. The official reference also documents events, replies, tags, and webhook-plugin settings; those capabilities are outside this focused tool refresh.
