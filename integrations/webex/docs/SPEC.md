# Cisco Webex API coverage

Messaging: send, get, edit, delete and list messages; CRUD and list spaces; create/update/delete/list space memberships; create/delete/list teams. Directory: list people and get a person, including the current authenticated person via `/people/me`. Meetings: create/get/PATCH/delete/list schedules and list/get recordings. Files: exact message-content delivery and temporary direct recording-video delivery with native expiry renewal.

Authorization code exchange and refresh use form-encoded `/v1/access_token`; API requests use Bearer authorization at `https://webexapis.com/v1`. No arbitrary API hosts or administrative onboarding are accepted. OAuth registration scopes must match the declared granular scope list; stored legacy tokens retain their own permissions. Bot restrictions and meeting host/license requirements are not inferred from a token string.

See the README for paging, deletion, retained effects, runtime prerequisites and download restrictions. API reference source: https://github.com/webex/webex-openapi-specs/tree/main/public-spec. Authentication: https://developer.webex.com/docs/authentication. Scopes: https://developer.webex.com/docs/integration-scopes. Messaging/file basics: https://developer.webex.com/meeting/docs/basics.
