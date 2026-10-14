# Spoki integration

Spoki is a WhatsApp Business platform for contact management, messaging, and
configured automation workflows.

## Authentication

Requests use the `X-Spoki-Api-Key` header. Obtain an API key from the API
integration section of the Spoki account. The current documented API base URL
is `https://api.spoki.com/api/1/`.

## Supported workflows

- Identify accessible accounts with `list_accounts`.
- Create or update contacts by phone using `contacts/sync/`; update a specific
  contact with PATCH. Retrieve, list, and delete contacts.
- Manage contact tags and list memberships; discover, create, and delete lists.
- Send free-form WhatsApp text messages within the supported conversation
  window. Send approved templates discovered with `list_templates`.
- Discover configured automations with `list_automations`. Start one for a
  contact or for up to 500 contacts. The automation ID is resolved to its active
  API startup step; `webhookUuid` selects a step when there are multiple. The
  startup secret is obtained internally from the automation details.
- Create, update, list, and delete sales deals using the existing deal tools.

## API contract notes

Text and template messages both use `POST /messages/send/`. Text requests use
`type: "Message"`, `content_type: "Text"`, and `text`; template requests use
`type: "Template"` and the numeric `template` ID. Automation starts use
`POST /wh/ap/{uuid}/` or `POST /wh/ap/{uuid}/bulk/` with a `secret` body field.

The current public collection does not describe the existing deal or
contact-tag mutation routes. Those tools remain available for compatibility,
with no assertion that the endpoints were removed. The contact `tags` and
`lists` write fields and contact-list search filters also require live
verification. This refresh has no live-provider verification.

## Official documentation

- [API collection](https://documenter.getpostman.com/view/21611004/UzBqnPvF)
- [Spoki API guide](https://support.spoki.com/en/docs/integrations/integrate-spoki-with-any-management-system-via-api/)
