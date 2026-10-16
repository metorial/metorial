# Ticketmaster

Search live events, attractions, venues, and classification hierarchies using the Discovery API. Event results include provider purchase links, supplied prices, and event dates. This integration provides 11 read-only tools grouped by API: Discovery, Commerce, and Inventory Status.

## Authentication

Use a developer Consumer Key as the API key. Requests send it as the `apikey` query parameter over HTTPS. Discovery has no suitable current-user endpoint, so no identity tool is exposed. Inventory Status requires separate Ticketmaster authorization. Commerce access and legacy endpoint support must be confirmed with Ticketmaster.

## Capabilities

- Search events, attractions, and venues; retrieve details for each resource.
- Browse classifications with their complete supplied hierarchy and look up a classification by ID.
- Retrieve search suggestions grouped by resource type.
- Retrieve legacy Commerce event offers where supported by the connected key.
- Check primary and resale inventory, unknown-status reasons, and available price ranges.

Discovery searches accept page numbers from zero and page sizes up to 200. The product of size and page must remain below 1000. The default developer quota is 5000 calls daily and five calls per second. New optional filters include classification IDs, classification types, public sale dates, TBA/TBD controls, and geohashes. Older latitude/longitude inputs remain available for compatibility.

Inventory requests must group events by one source and country and fit the documented 7 KB event-list limit. Price coverage varies by market and refreshes at most hourly. `listingsExtendBeyondMax` identifies capped maximum prices. Status strings retain provider values such as `TICKETS_AVAILABLE`, `FEW_TICKETS_LEFT`, and `UNKNOWN`.

Only scalar omissions evidenced by complete same-endpoint Discovery success examples are optional; original types remain unchanged. The remaining required values keep their baseline contracts. Nine tools validated against complete official Discovery/Inventory examples report malformed required output as an error. Commerce and Suggest retain their existing required schemas without the newly introduced broad response guard because complete current examples are unavailable. Existing nullable numeric fields and nullable related-resource fields retain their original types. No purchasing, reservation, ticket scanning, season-ticketing, or third-party inventory ingestion tools are implemented.

## Documentation limits

The public Commerce v2 documentation link redirects to a missing page. The existing endpoint is retained for compatibility, with no claim of runtime verification. Inventory documentation labels its operation POST while its examples show query-only URLs; the existing GET request is retained pending provider confirmation. No trigger or webhook API is implemented.

## Official sources

- [Discovery API v2](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
- [Inventory Status API](https://developer.ticketmaster.com/products-and-docs/apis/inventory-status/)
- [Getting started](https://developer.ticketmaster.com/products-and-docs/apis/getting-started/)
- [Partner API access](https://developer.ticketmaster.com/products-and-docs/apis/partner/)
- [Partner Commerce access FAQ](https://developer.ticketmaster.com/support/faq/)
