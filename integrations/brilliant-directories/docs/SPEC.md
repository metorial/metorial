# Brilliant Directories Integration

Connect using an API key generated in Developer Hub and the full canonical website URL, including `https://` or `http://`. The website URL remains connection configuration; the API key remains authentication input. Every request sends `X-Api-Key`. No OAuth scopes or refresh token are involved.

## Supported workflows

The integration provides member, lead, review, post, photo-album, widget, post-type, transaction-history, login-verification, and unsubscribe-record tools. Existing record outputs preserve the provider result; the `raw` output also exposes the complete provider response. Widget rendering returns `renderedHtml` alongside the original confirmation.

`who_am_i` verifies the connected API key and returns its website and key name. `list_records` lists any standard resource, including gallery photos and click records, using cursor pagination, field filters and sorting. Use `data_categories` to discover a post type's `data_id`, `data_type`, and `form_name`. `get_writable_fields` discovers base and custom writable fields.

## Requests and pagination

Writes use form-encoded bodies and reads use query parameters. List endpoints accept opaque `next_page` or `prev_page` tokens as `page`; the provider defaults to 25 records and supports at most 100. The existing full-text search endpoints use page numbers represented as strings in their public inputs. Pagination metadata is available in `raw` without invented totals or cursors.

Member contact inputs map to the provider's `phone_number`, `address1`, `state_code`, `zip_code`, and `country_code` fields. Member credit updates use a single `credit_action` and `credit_amount`. Widget content maps to `widget_data`; post-type names and activation map to `data_name` and `data_active`.

## Provider references

- [Getting Started](https://support.brilliantdirectories.com/support/solutions/articles/12000108046)
- [API resource index](https://support.brilliantdirectories.com/support/solutions/articles/12000108045)
- [Users](https://support.brilliantdirectories.com/support/solutions/articles/12000108047)
- [Posts](https://support.brilliantdirectories.com/support/solutions/articles/12000108050)
- [Album groups](https://support.brilliantdirectories.com/support/solutions/articles/12000108051)
- [Reviews](https://support.brilliantdirectories.com/support/solutions/articles/12000108053)
- [Post types](https://support.brilliantdirectories.com/support/solutions/articles/12000108054)
- [Unsubscribe records](https://support.brilliantdirectories.com/support/solutions/articles/12000108055)
- [Widgets](https://support.brilliantdirectories.com/support/solutions/articles/12000108056)

## Limits

The integration has no registered event triggers. Advanced administrative APIs and standalone album-photo/click mutation tools are outside this package's current tool surface. Legacy provider options remain available where previously exposed; their current availability depends on the website and API permissions. Provider runtime behavior has not been verified by this documentation refresh.
