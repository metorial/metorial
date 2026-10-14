# Endorsal Integration Specification

Endorsal collects, manages, and displays customer testimonials. This integration exposes contact and testimonial management, search, tag discovery, campaign inspection, widget inspection, and the existing SuperLink tool.

## Authentication

Use a property-specific API key from [Endorsal API settings](https://app.endorsal.io/account/api). Requests use `Authorization: Bearer <api_key>` and the base URL `https://api.endorsal.io/v1`. Configuration has no required resource IDs. Endorsal's documented public API has no current-user or account identity endpoint.

## Contact management

`list_contacts`, `get_contact`, `create_contact`, `update_contact`, and `archive_contact` manage customer records. Creation needs an email or phone number and can enroll the new contact in an AutoRequest campaign through the `campaignID` query parameter. Updates submit a `fields` object and then retrieve the updated resource so returned fields come from Endorsal. Contact creation timestamps are read from the provider's `activity.added` field. Archiving preserves the fetched contact identity and only reports success after the provider confirms the archive.

`search_contacts` submits AND-combined field comparisons to `POST /contacts/search`. Comparisons accept string, number, null, or array values; the `in` operator requires an array. The provider's documented operators are `=`, `>`, `>=`, `<`, `<=`, `!=`, `contains`, and `in`.

## Testimonials and tags

`list_testimonials`, `get_testimonial`, `create_testimonial`, `update_testimonial`, and `delete_testimonial` manage reviews. A list can target either a contact or a tag. Testimonial creation requires a reviewer name, comments, and property ID. Approval and featured boolean inputs map to the provider's numeric status values. Updates submit a `fields` object and retrieve the current testimonial after confirmation. Deletes must receive a successful provider confirmation.

Testimonial avatar objects expose their real URL through the existing `avatar` field; optional `avatarDetails` retains the provider's complete image-size data. Numeric timestamp fields retain their types.

`search_testimonials` submits the same documented comparison format to `POST /testimonials/search`. `list_tags` discovers tag IDs, names, categories, and complete tag details from `GET /tags`. Pass a discovered tag ID to `list_testimonials`.

## Campaigns, widgets, and lists

`list_campaigns` lists campaigns or retrieves one campaign by ID. The provider's `live`, `added`, and `edited` values map to the existing enabled, created, and updated output fields. `list_widgets` maps the documented widget name, type/layout, configuration settings, and edit timestamp.

Documented list endpoints return complete arrays without `page` or `limit` parameters. Existing pagination inputs remain optional numbers and are applied locally. Runtime validation requires positive whole-number values. Listing testimonials for a contact or tag also honors those inputs. Contact and testimonial totals reflect the complete returned list before pagination.

## SuperLinks and verification limits

`create_superlink` retains the existing `POST /superlinks` request and URL output. This route is absent from the current published OpenAPI reference, so its current provider request and response contract remains unverified. Absence from that reference does not establish that the API route was removed.

The current refresh used the [official API reference](https://developers.endorsal.io/docs/endorsal/YXBpOjE2OTAxMDk-public-rest-api) and its [published OpenAPI source](https://developers.endorsal.io/api/v1/projects/endorsal/endorsal/nodes/Public%20API/Endorsal.v1.json). No live provider operations were performed.
