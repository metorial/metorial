# Cincopa Integration

Cincopa hosts media assets organized into galleries and portals. Connect with an API token from the Cincopa Account Dashboard; the token's configured permissions control available operations. The integration sends `api_token` to the provider and has no additional connection settings.

## Supported workflows

- Discover the authenticated user, account, and permissions with `get_current_user`.
- Search and filter galleries with `list_galleries`; create with `create_gallery`.
- List gallery items or add/remove existing assets with `gallery_items`.
- Search assets by text, reference ID, type, asset ID, or tag with `list_assets`; retrieve the provider tag cloud with `get_asset_tags`.
- Use `set_media_metadata` to update documented gallery names/descriptions/tags or asset captions/descriptions/tags/reference IDs/links/thumbnails. Empty strings are sent as supplied. Asset and gallery fields have separate meanings.
- Use `import_media` to start or abort a URL import. Track it with `upload_media` and `action: check_status`. `upload_media` also creates a direct POST upload URL.
- Use `download_gallery` to prepare a ZIP of original or resized files. The provider supplies the download link.
- List portals with `manage_portal`. Use `manage_portal_subdomain` to check availability, save portal settings and access options, rename, or remove a subdomain.
- Use `manage_live_stream` for listing and lifecycle operations. Creation accepts a region and stream mode. Provider usage, state, and notes are exposed when returned.

List results retain provider object fields. `totalCount` is present only when the provider returns a numeric total; the number on the current page is not a total. Pagination parameters are optional and leave provider defaults in place.

## Compatibility notes

The original tool keys, inputs, enum values, and output types remain available. Legacy requests are retained, including `gallery.update.json`, `gallery.zip.json`, `asset.set.json`, portal ID operations, GET mutation requests, and URL imports using `url`. Current official documentation describes different metadata, download, import, and subdomain APIs; use the dedicated tools above for those documented workflows. Documentation absence does not establish that older routes are retired.

The existing `manage_gallery` master action accepts an asset ID; the documented `gallery.set_master.json` method instead describes a master gallery. That legacy behavior is retained and requires provider verification. Live lifecycle and pagination requests retain old parameters and also send their documented `liveid` and `items_per_page` aliases. Gallery item removal retains `delete_asset` and also sends the documented `delete_assets` equivalent.

No analytics, lead-management, webhook-registration, trigger, or frontend recording tools are registered. These provider capabilities are outside the current tool surface. Temporary credentials and invite-upload tokens are not returned by new tools.

## Provider references

- [API authentication and identity](https://developer.cincopa.com/apis/general)
- [Galleries](https://developer.cincopa.com/apis/gallery)
- [Assets and URL uploads](https://developer.cincopa.com/apis/assets)
- [Portal settings](https://developer.cincopa.com/apis/portal)
- [Live streams](https://developer.cincopa.com/apis/live)
- [Official OpenAPI description](https://developer.cincopa.com/_spec/apis/index.json)
