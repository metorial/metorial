# Accredible Certificates

Accredible organizes digital certificates and badges into credentials, groups, and visual designs.

## Authentication

Use an API key with `Authorization: Token token=<key>`. Select `production_us` (the default), `production_eu`, or `sandbox` during connection setup. Issuer lookup uses `GET /v1/issuer/details` on the selected host. Account-wide and department-specific API keys retain the provider's access restrictions. Connections created with the previous configuration continue using their stored environment until an auth environment is supplied.

## Tools

- Credentials: issue, retrieve, update, delete, and search by group, recipient, issue dates, and update dates. Search uses `POST /v2/credentials/search`, mapping page/pageSize to an offset and retaining the existing public result fields. The provider limits offset search to the first 10,000 results.
- Groups: create, retrieve, update, delete, and list through `POST /v1/issuer/groups/search`.
- Designs: discover templates through `POST /v1/designs/search`. Page/pageSize select a local portion of the returned set. The official specification omits its response schema and completeness guarantee, so these tools do not infer global totals.
- Account: `get_issuer` returns issuer identity and certificate credits.
- Files: `generate_credential_pdf` calls `POST /v1/credentials/generate_single_pdf/{id}` and provides a downloadable PDF. The credential must be published. The response contains the signed provider URL, whose expiry is not documented; generate a fresh PDF when necessary.

## Behavior

HTTP failures retain provider status and validation messages. Malformed successful responses without required identifiers or result arrays fail explicitly. Optional nullable provider values are omitted where the existing public field accepts only a string or object.

Creating credentials without sufficient credits can save them without publishing them. Existing optional group fields remain optional; Accredible may require course name and description when creating a group.

## Official reference

- [REST API documentation](https://docs.api.accredible.com/)
- [Provider-maintained OpenAPI specification](https://github.com/accredible/api-documentation/blob/master/openapi.json)
