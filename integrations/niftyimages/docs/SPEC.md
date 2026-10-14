# NiftyImages Specification

## Overview

Manage dynamic email images, countdown timer deadlines, Data Store records, map locations, Photoshop layers, and widget or Bee Plugin usage.

## Authentication and API access

Save a NiftyImages account API key as the connection credential. Legacy operations use `https://api.niftyimages.com/v1/` with the `ApiKey` header. Data Store tools require the specific store's API key, and timer updates require the timer's API key; each replaces the account credential for that request. Bee Plugin tools also require the plugin key from the integration configuration. The [legacy reference](https://api.niftyimages.com/images) documents v1 authentication and resource operations.

Account identity and numeric image/map ID resolution use `https://dev.niftyimages.com/v2/` with `Authorization: Bearer <API_KEY>`. The [v2 authentication guide](https://dev.niftyimages.com/docs/authentication) requires Bearer authentication. Store-scoped keys are limited to their store's record workflows and cannot resolve image resources; numeric image-ID resolution requires an account-scoped key.

Developer API access requires Enterprise and is excluded from the standard trial, according to [NiftyImages' access information](https://niftyimages.com/Connect). A key that works with v1 should not be assumed to have v2 access. Providing the production image/map URL returned by a list tool lets legacy operations run without the v2 numeric-ID lookup.

## Supported operations

- **Data Stores:** inspect fields, add or update records using their unique fields, and delete by record ID or unique-field values.
- **Timers:** update a target date, specify its format and UTC handling, and adjust it by hours, days, or months. The legacy `addMinutes` input remains available, but the public v1 reference does not confirm minute-adjustment support.
- **Maps:** list maps, read details, search locations by address text or coordinates, and add, update, or delete locations. Use returned `NiftyID` or imported `LocationID` values to identify a location. Custom property names must match the map configuration. The legacy `searchRadius` input remains available, but the public v1 reference does not confirm a per-search radius override or name matching.
- **Images:** list images by page, retrieve details, inspect date-filtered impression statistics, and delete images. Legacy list results include production URLs for later operations.
- **Photoshop:** inspect layers and update text, colors, visibility, or smart-object image URLs using the documented layer properties.
- **Widgets and Bee Plugin:** inspect usage and users, and suspend an identified user. Bee Plugin user discovery returns usernames and suspension status.
- **Account identity:** retrieve the connected account email and API-key identifier/name through `/v2/whoami`, using the response defined by the [current OpenAPI document](https://dev.niftyimages.com/openapi/v1.json).

Image changes become available when the image is fetched again; email-client caching can delay when a recipient sees them.
