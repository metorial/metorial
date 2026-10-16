# Melo

Melo provides French property listings, saved searches, location data, and market indicators. Its official documentation now redirects to [Stream Estate](https://docs.stream.estate/).

## Authentication and environments

Requests use an API key in the `X-API-KEY` header. Create a key on the API Keys page in your account console; no OAuth token refresh is required.

The `environment` setting accepts:

- `production` (the existing default): `https://api.notif.immo`.
- `sandbox`: `https://preprod-api.notif.immo`.
- `stream_estate`: the currently documented production host, `https://api.stream.estate`.

The current documentation does not establish the status of the legacy hosts or sandbox. Existing connections retain their selected host.

## Capabilities

| Tools | Provider route | Purpose |
| --- | --- | --- |
| `search_properties` | `GET /documents/properties` | Search listings with location, price, size, publisher, energy category, and creation/update date filters. |
| `get_property` | `GET /documents/properties/{id}` | Read a property and its adverts. |
| `find_similar_properties` | `GET /documents/properties/{id}/similar-properties` | Find comparable properties. |
| `list_saved_searches`, `create_saved_search` | `GET`, `POST /searches` | Discover or create saved searches. |
| `get_saved_search`, `update_saved_search`, `delete_saved_search` | `GET`, `PUT`, `DELETE /searches/{id}` | Inspect or manage a saved search. |
| `price_per_meter_evolution` | `GET /indicators/price_per_meter` | Read average, median, range, and historical prices per square meter. |
| `points_of_interest` | `GET /indicators/points_of_interest` | Find nearby facilities. |
| `location_autocomplete` | `GET /public/location-autocomplete` | Resolve location names to city or department IRIs. |
| `list_cities` | `GET /cities` | Discover city and department IRIs by name, ZIP code, or INSEE code. |

Department IRIs use provider IDs, which differ from administrative department codes. Resolve them with location discovery tools.

Saved searches can configure notification destinations using `endpointRecipient`, `eventEndpoint`, `notificationRecipient`, `notificationEnabled`, and `subscribedEvents`. These tools manage provider search settings; they do not register event triggers.

## Compatibility limits

Existing tool keys, field types, enums, requiredness, and raw picture URLs are preserved. The existing string-array `expressions` format remains available; current documentation shows nested expression groups instead, so acceptance of the legacy format requires provider verification. Points-of-interest examples include null names and empty arrays for attributes, while the existing normalized tool contract requires a string name and object attributes. That schema discrepancy remains open.

## Official references

- [Authentication](https://docs.stream.estate/api-reference/authentication)
- [Properties](https://docs.stream.estate/api-reference/endpoint/properties/get_collection)
- [Searches](https://docs.stream.estate/api-reference/endpoint/searches/get_collection)
- [Locations](https://docs.stream.estate/api-reference/endpoint/indicators/locations)
- [Cities](https://docs.stream.estate/api-reference/endpoint/indicators/cities)
