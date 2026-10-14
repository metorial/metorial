# Geoapify Specification

## Authentication

Geoapify uses a project API key in the `apiKey` query parameter on API requests. Create a project and generate a key at [Geoapify MyProjects](https://myprojects.geoapify.com/). API keys may have origin, referrer, or IP restrictions. There is no OAuth configuration or account-profile endpoint used by this integration.

## Available tools

- `geocode_address`: free-form or structured forward geocoding.
- `reverse_geocode`: coordinates to structured address data.
- `autocomplete_address`: address suggestions.
- `calculate_route`: route geometry, distance, duration, and directions.
- `calculate_route_matrix`: source-to-target distances and durations, up to 1000 pairs.
- `map_match`: snap up to 1000 GPS points to roads.
- `search_places`: category searches with geographic filters and proximity bias.
- `get_place_details`: place metadata, geometry, and nearby amenities.
- `calculate_isoline`: travel-time or distance reachability areas.
- `check_isoline`: deferred or cached isoline retrieval with a downloadable GeoJSON file.
- `lookup_boundaries`: containing or child administrative boundaries.
- `lookup_postcodes`: search by code or coordinates, or list with pagination.
- `ip_geolocation`: approximate IP location. Omitting the IP uses the integration server's outbound address.
- `batch_geocode`: submit up to 1000 addresses for asynchronous geocoding.
- `batch_reverse_geocode`: submit up to 1000 coordinates for asynchronous reverse geocoding.
- `check_batch_geocode`: retrieve forward or reverse batch results, including downloadable JSON.

## Deferred results

If `calculate_isoline` returns `pending: true`, call `check_isoline` with its `isolineId`. Isoline IDs can also retrieve completed results within 24 hours. Distance ranges use meters with metric units and miles with imperial units; time ranges always use seconds.

For `batch_geocode`, use `check_batch_geocode` with its `jobId`; the default direction is `forward`. For `batch_reverse_geocode`, use the same checker with `direction: "reverse"`. A submit request can complete immediately. Completed results are downloadable JSON files, and existing forward geocoding outputs continue to return structured results. Batch result retention is 24 hours.

## Provider documentation

- [Geocoding](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/)
- [Batch geocoding](https://apidocs.geoapify.com/docs/geocoding/batch/)
- [Isolines](https://apidocs.geoapify.com/docs/isolines/)
- [Routing](https://apidocs.geoapify.com/docs/routing/)
- [Route matrix](https://apidocs.geoapify.com/docs/route-matrix/)
- [Map matching](https://apidocs.geoapify.com/docs/map-matching/)
- [Places](https://apidocs.geoapify.com/docs/places/)
- [Place details](https://apidocs.geoapify.com/docs/place-details/)
- [Postcodes](https://apidocs.geoapify.com/docs/postcode/)
- [Boundaries](https://apidocs.geoapify.com/docs/boundaries/)

## Events

This integration exposes no triggers or webhook subscriptions.
