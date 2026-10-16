# NASA integration

This integration reads public astronomy, Earth science, media, technology, and orbital data. It has no write operations or push subscriptions. These public science services do not expose a suitable current-user identity endpoint.

## Authentication

Use a NASA developer key from [api.nasa.gov](https://api.nasa.gov/). Requests through that gateway send the key as `api_key`; `DEMO_KEY` is supported for limited exploration. NASA documents a default 1,000 requests per hour per key. `DEMO_KEY` has lower per-IP limits: 30 per hour and 50 per day. The Image and Video Library, EONET, Exoplanet Archive, JPL SSD, and community TLE services do not receive this key. No OAuth scopes, refresh tokens, or resource IDs are required.

## Tools and sources

| Tools | API contract |
| --- | --- |
| `get_apod_entries`, legacy `get_apod` | [NASA API catalog](https://github.com/nasa/api-docs/blob/gh-pages/assets/json/apis.json): current `/wp-json/wp/v2/apod-basic` service, date/range/random selection. Random count is at most 25. |
| `search_asteroids` | [NeoWs](https://api.nasa.gov/#NeoWS): feed, SPK-ID lookup, and paginated browse. Feed date intervals are at most seven days. |
| `get_mars_rover_photos`, `get_mars_rover_manifest` | [Original Mars API documentation](https://github.com/corincerami/mars-photo-api): sol/date and camera photo filters, mission manifests. |
| `get_epic_images` | [EPIC API](https://epic.gsfc.nasa.gov/about/api): natural/enhanced image metadata, available dates, and documented archive image paths. |
| `get_natural_events`, `get_natural_event_catalog` | [EONET v3](https://eonet.gsfc.nasa.gov/docs/v3): event filters and discovery of category/source identifiers. `status=all` includes open and closed events. |
| `get_space_weather` | [DONKI in the NASA catalog](https://github.com/nasa/api-docs/blob/gh-pages/assets/json/apis.json): event and notification date queries. Notifications cover at most 30 days. |
| `get_earth_imagery` | [Legacy Earth API](https://github.com/nasa/earth-imagery-api): location/date asset metadata and downloadable image URLs when available. |
| `search_nasa_media`, `get_nasa_media_assets`, `get_nasa_media_metadata` | [Image and Video Library API](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf): search, pagination links, asset files, metadata JSON, and video captions. |
| `search_tle` | [Community TLE service](https://tle.ivanstanojevic.me/), linked by the NASA catalog: name search, NORAD lookup, and page/page-size pagination. This service is operated independently of NASA. |
| `get_techport_project` | [TechPort](https://techport.nasa.gov/help/articles/api): project details and lists of updated project identifiers, requested as JSON. |
| `query_exoplanets` | [Exoplanet Archive TAP](https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html): synchronous SELECT queries returned as JSON. `ps` is Planetary Systems; `pscomppars` contains composite parameters. |
| `query_close_approaches`, legacy `get_close_approaches` | [JPL CAD](https://ssd-api.jpl.nasa.gov/doc/cad.html): object/body/date/distance filtering. The current tool preserves null measurements and offers optional diameters, names, sorting, limits, and record offsets. |
| `get_fireballs` | [JPL fireball API](https://ssd-api.jpl.nasa.gov/doc/fireball.html): event filters. Public `minEnergy` is in joules and is converted to the provider's `energy-min` units of 10^10 joules. |
| `lookup_small_body` | [JPL SBDB](https://ssd-api.jpl.nasa.gov/doc/sbdb.html): exactly one of designation, SPK-ID, or search name. Requests physical parameters and discovery data; preserves the full parameter array and response. |

## Provider changes and compatibility

NASA's [official portal notice](https://github.com/nasa/api-docs/blob/gh-pages/assets/html/header.html) marks the Earth API archived and replaced with Earthdata GIBS, and marks the Mars Rover API archived. The Earth API repository was archived on July 7, 2025. The original Mars API repository was archived on October 8, 2025 and states that the API is retired. Existing tool keys, input schemas, and historical response handling remain available; historical endpoint availability is not guaranteed. The integration does not substitute a different dataset or fabricate missing images. Use `search_nasa_media` for current general NASA media discovery, or consult [Earthdata GIBS](https://www.earthdata.nasa.gov/data/tools/gibs) for current Earth imagery services.

The NASA catalog documents APOD's migration on September 10, 2026 and legacy endpoint retirement on December 1, 2026. `get_apod_entries` uses the documented current science.nasa.gov endpoint. NASA's [current field definitions](https://github.com/nasa/apod-api/blob/master/README.md?plain=1) specify that `url` equals the article permalink and `hdurl` is the full-size featured image when available. The replacement exposes `articleUrl` separately, supplies optional `mediaUrl` only from the actual `hdurl` for image entries, and preserves the complete response in `raw`. Valid video/iframe entries remain present with their article permalink and provider metadata; no video media URL is invented or inferred. Image entries without `hdurl` remain valid with no `mediaUrl`. Available image media is downloadable.

Legacy `get_apod` is deprecated in favor of `get_apod_entries`; its original handler, media-URL schema, and legacy client request remain intact. NASA now forwards that legacy endpoint to its changed response, so the old tool's `url` can carry the provider's article URL instead of media; callers should migrate to the replacement. `thumbs` remains in the legacy contract, but NASA currently disables video thumbnails. No legacy endpoint is disabled before NASA's documented retirement date.

`get_close_approaches` retains its historical string-only table contract and handler and is deprecated in favor of `query_close_approaches`. JPL documents null cells for unavailable scientific measurements; the replacement explicitly represents those nulls without changing column alignment or inventing values. The old tool can fail output validation for such rows. The replacement preserves the complete response and the provider's signature/version.

Other existing tools retain their public fields. Except for the deprecated tools and NeoWs, they expose the complete provider response through an additive optional `raw` field. NeoWs retains the original scientific summaries and adds numeric pagination metadata; gateway response links are omitted because they can echo the API key. Image/media retrieval tools provide downloadable files and retain the original URLs and metadata. No expiry is invented for stable public file URLs. Legacy Earth imagery downloads use the authenticated NASA image endpoint with the same requested date and coordinates as the metadata request, rather than an unversioned signed Earth Engine image URL.
