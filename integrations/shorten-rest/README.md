# <img src="logo.png" height="20"> Shorten.rest

Create, retrieve, update, delete, and list shortened URLs. Configure vanity or random aliases, country and operating-system redirects, social preview meta tags, and tracking snippets. Use `short.fyi` or a custom domain already connected in the Shorten.REST dashboard.

Authenticate with an API key from [dash.shorten.rest](https://dash.shorten.rest). Requests use `https://api.shorten.rest` and the `x-api-key` header, as documented in the [official API reference](https://docs.shorten.rest/) and [Swagger specification](https://docs.shorten.rest/swagger.json).

`list_aliases` returns one domain's aliases, newest first. `list_clicks` returns account-wide click records, newest first. Both support page limits from 1 to 1000 and return `nextCursor`; pass it as `cursor` to continue.

`get_clicks` retrieves one account-wide page and filters it by the requested alias and domain. Its limit controls records examined rather than matching clicks returned. Keep following `nextCursor` even when a page has no matching clicks. The default domain is `short.fyi`.

When updating destinations, meta tags, or snippets, each supplied array replaces the entire property. Omitted properties stay unchanged. Domain setup and API key management remain in the provider dashboard.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
