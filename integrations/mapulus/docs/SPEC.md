# Mapulus API integration

## Authentication

Mapulus Studio uses an API key as a Bearer token. Create one in Profile > API Keys and grant the map/location permissions needed for your workflow. Keys can have an expiry date; replace an expired or revoked key by reconnecting.

The integration uses the concrete Studio paths in the current [official OpenAPI reference](https://developer.mapulus.com/v1/openapi.json): `https://api.mapulus.com/api/v1/maps` and `/locations`. The reference overview also lists a different Studio prefix; endpoint definitions and examples use `/api/v1`.

## Tools

- `list_maps` and `get_map` discover maps and optionally expand their layers with `expand[]=layer`. Map titles are returned in the existing `name` field.
- `create_location`, `get_location`, `update_location`, and `delete_location` manage locations. Public latitude/longitude fields are translated to `lat`/`lon`. Custom attribute objects are translated to the API's named attribute array. Metadata-only updates first retrieve the existing layer and source location; this requires read access as well as update access.
- `find_locations` filters by map, layer, or external ID. A location ID retrieves the specific resource. The existing address and coordinate filter parameters are preserved, but the current reference does not document them.
- `search_nearby` requests nearest locations by driving, cycling, or walking, sorted by time or distance. An optional radius requires source coordinates and filters the returned candidates by direct geographic distance; it does not enumerate every location in the radius.
- `add_travel_boundary` updates the location's travel contour. The current reference documents positive travel time in minutes for driving, cycling, or walking. Unsupported modes or units produce a clear validation error.
- `lookup_territory` retains its existing endpoint and inputs for compatibility. Its `/maps/{id}/territory` endpoint is not described in the current reference, so its availability remains unverified.

Studio lists are paginated. This integration currently returns their first page; the reference exposes page metadata but does not document a page-selection parameter. No identity endpoint is documented for Studio, so there is no current-user tool.

## Sources

- [Official developer reference](https://developer.mapulus.com/v1/docs)
- [Official OpenAPI schema](https://developer.mapulus.com/v1/openapi.json)
- [API key setup](https://www.mapulus.com/support/connecting-zapier-to-mapulus)
- [Nearest-location query example](https://www.mapulus.com/support/finding-the-nearst-location-with-zapier-and-mapulus-api)

The separate Data API is outside this Studio-focused refresh. No live-provider verification has been performed.
