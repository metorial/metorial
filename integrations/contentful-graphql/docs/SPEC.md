# Slates Specification for Contentful Graphql

## Overview

Contentful is a headless content management system (CMS) that stores and delivers structured content via APIs. The Contentful GraphQL Content API provides a GraphQL interface on top of the Content Delivery API (CDA) and Content Preview API (CPA), allowing clients to query published and unpublished content using GraphQL. Every Contentful space comes with a GraphQL schema based on its content types, and the schema gets regenerated every time these content types are updated.

## Authentication

Contentful GraphQL API uses **Bearer token authentication** via API keys (not OAuth).

Any client using the API needs to provide an access token in either the `Authorization` header (`Authorization: Bearer MY_TOKEN`) or the `access_token` URL query parameter. The header method is recommended.

There are two types of tokens relevant to the GraphQL API:

- **Content Delivery API (CDA) token**: Used to query published content. The GraphQL API is built on top of the Contentful Delivery API (CDA), so you can use any existing CDA keys.
- **Content Preview API (CPA) token**: Used to query draft/unpublished content. Accessing non-published content is useful for previewing how new content will look before publishing. The GraphQL API gives you control to choose whether you access published or non-published content.

To obtain API keys, navigate to Settings > API keys in the Contentful web app for the target space, and create a token.

In addition to the token, the following parameters are required:

- **Space ID**: Identifies which Contentful space to query.
- **Environment ID**: Identifies which environment within the space (e.g., `master`). Defaults to `master` if not specified.

The base URL is: `https://graphql.contentful.com/content/v1/spaces/{SPACE_ID}`, with an optional `/environments/{ENVIRONMENT}` path segment.

For EU data residency customers, the GraphQL Content API is available at `graphql.eu.contentful.com`.

The token must have access to the space and environment being targeted. If you create an access token that only has access to the master environment, you cannot use that token to access content from any other environment or space.

## Features

### Content Querying

Query entries and assets from your Contentful space using GraphQL. GraphQL gives developers flexibility in retrieving data from APIs — in a single query, you can ask for exactly what you want, regardless of content type, with the help of a strongly-typed schema. You can retrieve single entries by ID or query collections of entries by content type.

### Filtering and Sorting

Collections can be filtered using auto-generated filter inputs based on your content model. The GraphQL Content API does not distinguish between Symbol and Text types and generates the same filters for both. Supported filter operators include equality, inequality, existence (`_exists`), and more. The `_exists` filter is available for single and multi-reference fields, allowing you to find entries with or without specific references. Collections can also be sorted by field values.

### Linked Entry Traversal

One of the benefits of GraphQL is that it simplifies traversing the graph of relationships between different types. In Contentful, relationships are modeled using links. An entry field can be a link to another entry or a list of links to other entries. The `linkedFrom` field allows reverse lookups — instead of querying entries and filtering by linked reference, you can query a single entity and fetch the entries that contain it as a linked reference.

### Localization

Contentful allows you to create and handle content in different locales. Fields on entries provide an optional `locale` argument, allowing the locale to be overridden for a single field. The current scope's locale is used if a locale is not specified. Fields also support an optional `useFallbackLocale` argument. When set to false, the field returns null if no value exists in the requested locale, instead of the fallback locale.

### Content Preview (Draft Content)

By using a Content Preview API token, you can access unpublished/draft content through the same GraphQL interface. This is useful for building preview environments where editors can see content before it goes live. To access draft content, you need to use your Contentful Preview API token.

### Rich Text

Fields of type RichText are handled with dedicated GraphQL types. Rich Text responses include structured JSON with embedded links to other entries and assets, which can be resolved within the same query.

### Asset Querying

You can query assets (images, files, etc.) stored in Contentful. Locations are represented as types with the properties `lat` and `lon`. Assets include metadata such as file name, URL, content type, dimensions, and size.

### Schema Introspection

The GraphQL schema is auto-generated from your content model and supports standard GraphQL introspection. This allows tools like GraphiQL and GraphQL Playground to provide documentation and auto-completion for your specific content model.

## Events

Contentful supports webhooks that can be configured to fire on content and action events. Note that webhooks are managed through the Content Management API, not the GraphQL API itself.

### Content Type Events

Webhooks can be triggered when content types are created, saved, or deleted. Useful for monitoring changes to the content model.

### Entry Events

For an Entry webhook, Contentful supports all potential actions: create, save, auto_save, archive, unarchive, publish, unpublish, and delete. These can be filtered by environment and specific entry IDs.

### Asset Events

Similar to entry events, asset webhooks fire on create, save, auto_save, archive, unarchive, publish, unpublish, and delete actions for media assets.

### Task Events

Webhooks can be triggered for task-related events within entries (e.g., task creation or updates).

### Release Events

Releases are containers for multiple entries and assets that can have an action taken upon all referenced content. Release webhooks are called when the release entity itself is changed or deleted. Supported actions include create, save, and delete.

### Release Action Events

Release actions are a specific attempt to take an action on a release, such as publish or unpublish. Create is emitted after the release action has been created, and execute is emitted after the release action has been executed, regardless of outcome.

### Scheduled Action Events

Scheduled action webhooks can be used for keeping external systems apprised of changes to upcoming events or for emitting messages in the case of a failed scheduled action execution.

### Webhook Configuration Options

- When creating a webhook you have to explicitly specify which changes on your content (topics) you want your webhook called for.
- Topics follow a `[Type].[Action]` pattern with wildcard support (e.g., `Entry.publish`, `Asset.*`, `*.*`).
- The webhook definition holds a filters property. Filtering is a second step after defining the topics. Typical use cases for filtering are enabling a webhook only for a specific environment ID or entry ID.
- Webhooks support custom headers, HTTP basic authentication, and payload transformations.
