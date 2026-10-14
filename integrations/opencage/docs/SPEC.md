# OpenCage Geocoding

Uses the [official geocoding API](https://opencagedata.com/api) at
`https://api.opencagedata.com/geocode/v1/json`. Authentication sends the
32-character geocoding API key as the `key` query parameter. The location is
sent as `q`; coordinates use latitude,longitude in WGS 84 decimal degrees.

## Tools

- `forward_geocode`: addresses or place names, with country, bounds,
  proximity, language, formatting, privacy, and annotation options. The
  result limit is a whole number from 1 to 100 (default 10).
- `reverse_geocode`: coordinates to an address, with language, privacy, and
  annotation options. OpenCage returns at most one result; the existing
  `limit` input remains accepted for compatibility and is not sent.
- `batch_geocode`: one to ten addresses or place names, using a separate GET
  for every query. Requests run sequentially with a 1.1-second pause between
  requests. A failed request stops the batch; earlier requests still consume
  quota. Concurrent callers sharing the same key must coordinate rate limits.

The existing `minConfidence` input and `min_confidence` wire parameter remain
available on the single-query tools for compatibility. The current optional
parameter table does not document this parameter, so current upstream behavior
has not been confirmed.

## Results

Results retain formatted addresses, coordinates, confidence, address
components, optional bounding boxes, and location annotations. Array-valued
components are joined with commas to preserve the existing string/number
output contract. ISO 3166-2 values are also returned as the exact
`iso3166SubdivisionCodes` list. Reverse results expose
`distanceFromQueryMeters` when supplied by OpenCage.

Missing rate metadata is expected for subscription customers. Provider errors,
timeouts, and missing results arrays produce structured errors. `roadinfo`
requests the nearest road rather than the nearest address and can still return
road annotations when `noAnnotations` is enabled.

## Scope

Geosearch/autosuggest requires separate credentials and is not exposed here.
Spreadsheet upload is a dashboard feature, not a bulk API endpoint. These
tools return structured JSON results rather than downloadable exports.
