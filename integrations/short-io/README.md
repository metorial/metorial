# <img src="logo.jpeg" height="20"> Short Io

Create, update, archive, delete, and search branded short links. Shorten URLs individually or in batches of up to 1,000, organize links in folders, customize social previews, and retrieve domain settings. Configure mobile redirects, expiration, passwords, cloaking, split testing, and campaign parameters. Retrieve link and domain analytics and generate downloadable PNG or SVG QR codes.

Connect a secret API key from the Short.io dashboard. Use `list_domains` to discover domain hostnames and IDs, then `list_folders` for folder IDs. Default domain settings are optional.

Archiving hides a link from the dashboard while redirects remain active. Bulk creation can partially succeed, so inspect each returned result. The existing `get_link` destination lookup returns one result; use `find_links_by_original_url` to retrieve all matching links.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
