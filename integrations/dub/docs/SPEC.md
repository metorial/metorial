# Dub API integration

Dub provides short-link management, attribution analytics, conversion events, customers, custom domains, tags, folders, and QR codes.

## Authentication

Use a workspace API key with the permissions needed for your operations, or OAuth 2.0 with PKCE. OAuth requests read/write access to links, domains, tags, folders, and customers, plus analytics and user information. The OAuth identity tool requires an OAuth connection. OAuth tokens are refreshed automatically.

## Available operations

- Create, retrieve, list, update, upsert, and delete short links.
- Retrieve analytics and individual click, lead, and sale events.
- Track leads and sales. Lead events use synchronous recording; duplicate customer/event-name pairs are not recorded again. Sale invoice IDs provide idempotency.
- List customers and retrieve, update, or delete individual customers.
- List, create, update, and delete custom domains, tags, and folders. Deleting a domain also deletes its links; deleting a folder keeps the links.
- Download QR codes in PNG or SVG format.
- Retrieve Open Graph metadata for a destination URL.

Link and customer lists support cursor pagination while retaining page-number inputs. Customer totals are omitted when Dub does not provide them.

## API references

- [OAuth guide](https://dub.co/docs/integrations/quickstart)
- [API authentication](https://dub.co/docs/api-reference/authentication)
- [API documentation index](https://dub.co/docs/llms.txt)
- [QR code API](https://dub.co/docs/api-reference/endpoint/retrieve-a-qr-code)
