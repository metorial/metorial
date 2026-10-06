# <img src="logo.png" height="20"> Contentful GraphQL

Read published entries, preview drafts with explicit `preview: true` arguments, and inspect the generated schema. Native queries support filters, sorting, locale arguments, linked content, rich-text references, assets and offset or cursor pagination.

Configure a delivery API token and optionally a separate preview token. Choose the US or EU region. Supply the key-authorized `spaceId` on each content/schema call and optionally an `environmentId` or alias. Existing stored space settings remain a fallback. The optional CMA token enables `list_spaces` account discovery; CMA access does not prove delivery or preview key access. Without CMA, obtain the space/environment from API-key settings.

Queries are read-only but consume API quota and can resolve configured external references. The complete JSON request is limited to 8 KiB and responses to 8 MiB. Partial native data and errors remain visible. Asset URLs are content metadata; this integration does not download media, modify content or register webhooks.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
