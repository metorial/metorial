Now let me get details on the specific event types Radar supports and the fraud/trips features:Let me get the full list of event types from the Radar documentation:Now I have enough information to write the specification. Let me compile it.

# Slates Specification for Radar

## Overview

Radar is a location data infrastructure platform providing geofencing, location tracking, trip tracking, fraud detection, and maps services. Its Geofencing Platform includes geofencing, place visit detection, trip tracking, fraud detection, and analytics, while its Maps Platform offers geocoding APIs, search APIs, routing APIs, and base maps. Radar APIs serve as building blocks for location-based products and services like pickup and delivery tracking, location-triggered notifications, location verification, store locators, and address autocomplete.

## Authentication

Radar uses API key authentication. API keys are found on the Settings page in the Radar dashboard, and must be included in the `Authorization` header.

Radar provides four types of API keys across two environments:

- **Publishable keys** are safe to call client-side (e.g., from the SDK). Use the Test Publishable key for testing/non-production and the Live Publishable key for production.
- **Secret keys** are only safe to call server-side. Use the Test Secret key for testing/non-production and the Live Secret key for production.

Each API endpoint is designated as either Publishable-level or Secret-level, determining which key type is required.

Example request:

```
curl https://api.radar.io/v1/users \
  -H "Authorization: prj_live_sk_..."
```

Key prefixes follow the pattern: `prj_live_pk_...` (Live Publishable), `prj_test_pk_...` (Test Publishable), `prj_live_sk_...` (Live Secret), `prj_test_sk_...` (Test Secret).

## Features

### Geofencing

Create and manage geofences via the dashboard, CSV import, the API, nightly sync, or integrations. Geofences can be circles, polygons, or isochrones (time-based). Each geofence has a tag (group), external ID (maps to your internal database), description, and optional metadata. Operating hours can be set on geofences, and Radar indicates whether events occur during operating hours. Event generation can be restricted to operating hours only.

- Supports stop detection, buffer entries/exits, dwell detection, and confidence levels (1–3).
- Entry events fire when a user enters (or stops in) a geofence; exit events fire when a user leaves.

### User Tracking

Track user locations and generate location-based events. Users can be tracked via the SDK or the API's track endpoint by submitting coordinates, device ID, and user ID. You can search for users near a location, sorted by distance, and manage user metadata.

### Trip Tracking

Track trips from an origin to a destination with live ETAs. Useful for pickup/delivery tracking, fleet management, and curbside workflows. Trips allow personalizing the pickup and delivery experience, including reducing wait times and increasing food freshness.

- Trips progress through statuses: `started` → `approaching` → `arrived` → `completed`.
- Supports configurable approaching thresholds, delay detection, wrong destination detection, and trip expiration.
- Trips can be started, updated, and stopped via the SDK or API.

### Places

Radar's Places feature lets you instantly configure geofencing around thousands of chains (e.g., Starbucks, Walmart) and categories (e.g., airports, restaurants). Detects user visits to known points of interest without requiring you to create custom geofences.

### Regions

Detect the user's current country, state, DMA (designated market area), and postal code. Useful for geo-compliance and location-aware content delivery.

### Fraud Detection

Detect GPS spoofing, proxy and VPN usage, and device tampering. The fraud object on a user includes flags for mocked locations, location jumps, compromised devices, inaccurate locations, proxy usage, and location sharing.

### Geocoding

Convert between addresses and coordinates. Supports:

- **Forward geocoding**: address to coordinates.
- **Reverse geocoding**: coordinates to address.
- **IP geocoding**: IP address to approximate location (city, state, country).

### Search

Search for places, addresses, and geofences near a location. Includes:

- **Autocomplete**: address and place autocomplete for search boxes and forms.
- **Search places**: find nearby points of interest by category or chain.
- **Search geofences**: find nearby geofences by tag or metadata.

### Routing

Calculate distance and travel duration between origins and destinations. Supports travel modes: car, truck, foot, and bike. Useful for ETAs and route optimization.

### Maps

Render interactive and static base maps. Includes map tiles and static map image generation for embedding in emails, notifications, or dashboards.

### Address Validation

Validate and standardize postal addresses.

### Campaigns

Create location-based campaigns and audience segments based on geofence visits, place visits, and location patterns.

## Events

Radar supports webhooks to send events and user state to your server or any HTTP endpoint. From there, you can store events in a database, send them to a marketing automation or analytics platform, and more.

Webhooks are configured on the Radar Integrations page. You choose a Test or Live environment, single or multiple event delivery, and provide a URL. Whenever events are generated, Radar sends a POST request with event and user data to the specified URL.

Each webhook has a random security token. Request authenticity can be verified using the `X-Radar-Signature` header, which contains an HMAC-SHA1 hash of the `X-Radar-Signing-Id` header using the security token as the key.

### Geofence Events

Events triggered when users interact with your custom geofences:

- `user.entered_geofence` — User entered a geofence.
- `user.exited_geofence` — User exited a geofence.
- `user.dwelled_in_geofence` — User remained in a geofence beyond a configured dwell threshold.

Each event includes confidence level, geofence metadata (tag, external ID, description), and operating hours status.

### Place Events

Events triggered when users visit known points of interest from Radar's places database:

- `user.entered_place` — User entered a known place.
- `user.exited_place` — User exited a known place.

Events include place name, chain, and categories.

### Trip Events

Events triggered during trip lifecycle:

- `user.started_trip` — A trip was started.
- `user.updated_trip` — A trip was updated (includes live ETA).
- `user.approaching_trip_destination` — User is approaching the destination (configurable ETA threshold).
- `user.arrived_at_trip_destination` — User arrived at the destination geofence.
- `user.stopped_trip` — The trip was stopped or completed.
- `user.arrived_at_wrong_trip_destination` — User entered a geofence with the same tag but different external ID than the intended destination.

### Region Events

Events triggered when users cross administrative boundaries:

- `user.entered_region_country` — User entered a country.
- `user.exited_region_country` — User exited a country.
- `user.entered_region_state` — User entered a state.
- `user.exited_region_state` — User exited a state.
- `user.entered_region_dma` — User entered a DMA.
- `user.exited_region_dma` — User exited a DMA.

### Beacon Events

Events triggered by proximity to hardware beacons:

- `user.entered_beacon` — User entered a beacon range.
- `user.exited_beacon` — User exited a beacon range.
