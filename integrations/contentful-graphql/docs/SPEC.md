# Contentful GraphQL API

Five read-only tools: `query_content`, `preview_content`, `introspect_schema`, `list_content_types`, and optional-CMA `list_spaces`. Delivery queries use the CDA token; preview queries require the separate CPA token and explicit native `preview: true` arguments. The query and variables are not rewritten. `operationName` selects a query in a document containing several operations; mutations and subscriptions are refused.

Content and schema calls accept `spaceId` and `environmentId`. A previously stored connection space remains a fallback. New connections do not require an opaque space ID during setup. `list_spaces` discovers IDs/names through `GET /spaces` with the optional CMA token, using native offset or cursor paging. This inventory reflects management-token account access, not delivery/preview key scope. Without CMA, choose the space and environment authorized by the delivery/preview key in Contentful API-key settings.

GraphQL requests target `/content/v1/spaces/{space}/environments/{environment}` at `graphql.contentful.com` or `graphql.eu.contentful.com`. The complete JSON payload, including variables and operation name, must fit within 8 KiB. Provider schema validation, native cost limits and plan restrictions still apply. This integration does not implement automatic persisted queries or cross-space authorization headers.

Native offset collections use `skip`/`limit` and may provide totals. Native `CursorCollection` fields use `pageNext`/`pagePrev` and `pages.next`/`pages.prev`; filters stay fixed across pages except limit. Cursor strings remain unchanged. Partial GraphQL data/errors remain visible without claiming a complete result. Introspection refuses incomplete/error responses instead of producing an empty schema.

Queries can resolve configured external references and consume API quota. Asset URLs remain provider metadata. No content mutations, media downloads, identity claims, webhook registration or cleanup operations are exposed. Tokens remain secret and are never included in discovery results.

Official references: [GraphQL API](https://www.contentful.com/developers/docs/references/graphql/overview/), [GraphQL errors](https://www.contentful.com/developers/docs/references/graphql/graphql-errors/), [authentication](https://www.contentful.com/developers/docs/references/authentication/), [space discovery](https://www.contentful.com/developers/docs/references/content-management-api/spaces/get-all-spaces-an-account-has-access-to/).
