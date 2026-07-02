# TomTom APIs - Complete Endpoints Summary Table

This is a quick reference table of all researched TomTom API endpoints with their exact URLs, HTTP methods, and key parameters.

---

## Traffic Flow API

| Endpoint          | HTTP | URL Pattern                                                   | Key Parameters                      | Auth    |
| ----------------- | ---- | ------------------------------------------------------------- | ----------------------------------- | ------- |
| Flow Segment Data | GET  | `/traffic/services/4/flowSegmentData/{style}/{zoom}/{format}` | key, point, unit, thickness, openLr | API Key |

**Query Params:** `style` (absolute/relative/relative0/relative0-dark/relative-delay/reduced-sensitivity), `zoom` (0-22), `format` (xml/json/jsonp), `point` (lat,lon), `unit` (kmph/mph, default kmph), `thickness` (1-20, default 10), `openLr` (boolean)

---

## Traffic Incidents API

| Endpoint         | HTTP | URL Pattern                           | Key Parameters                                                      | Max | Auth    |
| ---------------- | ---- | ------------------------------------- | ------------------------------------------------------------------- | --- | ------- |
| Incident Details | GET  | `/traffic/services/5/incidentDetails` | key, bbox (or ids ≤5), language, categoryFilter, timeValidityFilter | 5   | API Key |
| Incident Details | POST | `/traffic/services/5/incidentDetails` | key, ids (in body), language, categoryFilter, timeValidityFilter    | 100 | API Key |

**POST Body:** `{ "ids": ["id1", "id2", ...] }`

**Query Params:** `bbox` (minLon,minLat,maxLon,maxLat), `language` (default en-GB), `categoryFilter` (0-11, 14), `timeValidityFilter` (present/future)

---

## Geofencing API - Projects

| Endpoint            | HTTP | URL Pattern                          | Key Parameters           | Auth                |
| ------------------- | ---- | ------------------------------------ | ------------------------ | ------------------- |
| List Projects       | GET  | `/geofencing/1/projects`             | key                      | API Key             |
| Get Project Details | GET  | `/geofencing/1/projects/{projectId}` | key, projectId           | API Key             |
| Edit Projects       | PUT  | `/geofencing/1/projects/{projectId}` | key, adminKey, projectId | API Key + Admin Key |

---

## Geofencing API - Fences

| Endpoint          | HTTP   | URL Pattern                      | Key Parameters            | Auth                |
| ----------------- | ------ | -------------------------------- | ------------------------- | ------------------- |
| List Fences       | GET    | `/geofencing/1/fences`           | key                       | API Key             |
| Get Fence Details | GET    | `/geofencing/1/fences/{fenceId}` | key, fenceId, showGeoJson | API Key             |
| Create Fence      | POST   | `/geofencing/1/fences`           | key, adminKey (body)      | API Key + Admin Key |
| Edit Fence        | PUT    | `/geofencing/1/fences/{fenceId}` | key, adminKey, fenceId    | API Key + Admin Key |
| Delete Fence      | DELETE | `/geofencing/1/fences/{fenceId}` | key, adminKey, fenceId    | API Key + Admin Key |

**Query Param:** `showGeoJson` (boolean, default false)

---

## Geofencing API - Objects

| Endpoint           | HTTP   | URL Pattern                        | Key Parameters          | Auth                |
| ------------------ | ------ | ---------------------------------- | ----------------------- | ------------------- |
| List Objects       | GET    | `/geofencing/1/objects`            | key                     | API Key             |
| Get Object Details | GET    | `/geofencing/1/objects/{objectId}` | key, objectId           | API Key             |
| Create Object      | POST   | `/geofencing/1/objects`            | key, adminKey (body)    | API Key + Admin Key |
| Edit Object        | PUT    | `/geofencing/1/objects/{objectId}` | key, adminKey, objectId | API Key + Admin Key |
| Delete Object      | DELETE | `/geofencing/1/objects/{objectId}` | key, adminKey, objectId | API Key + Admin Key |

**POST/PUT Body:** `{ "name": "...", "defaultProject": "...", "properties": {...} }`

---

## Geofencing API - Report

| Endpoint       | HTTP | URL Pattern                        | Key Parameters                                  | Auth    |
| -------------- | ---- | ---------------------------------- | ----------------------------------------------- | ------- |
| Report Request | GET  | `/geofencing/1/report/{projectId}` | key, point, object, range, projectId            | API Key |
| Report Request | POST | `/geofencing/1/report/{projectId}` | key, point, object, range, timestamp, projectId | API Key |

**Query Params:** `point` (lon,lat[,alt]), `object` (UUID), `range` (0-100000, default 0), `timestamp` (ISO 8601, POST only)

**Returns:** Objects inside/outside fences with distances

---

## Location History API - Position History

| Endpoint             | HTTP | URL Pattern                                              | Key Parameters                                            | Auth                |
| -------------------- | ---- | -------------------------------------------------------- | --------------------------------------------------------- | ------------------- |
| Send Position        | POST | `/locationHistory/1/history/positions`                   | key (query), object, geometry, timestamp (body)           | API Key             |
| Get Position History | GET  | `/locationHistory/1/history/positions/{objectId}`        | key, adminKey, objectId, from, to, maxResults, pageNumber | API Key + Admin Key |
| Last Position        | GET  | `/locationHistory/1/history/positions/{objectId}/latest` | key, adminKey, objectId                                   | API Key + Admin Key |

**POST Body:** GeoJSON Feature with Point geometry

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [lon, lat, alt] },
  "object": "uuid",
  "timestamp": "ISO8601"
}
```

**GET Params:** `from` (ISO 8601, required), `to` (ISO 8601), `maxResults` (1-100, default 100), `pageNumber` (≥1, default 1)

---

## Location History API - Configuration

| Endpoint      | HTTP | URL Pattern                   | Key Parameters                 | Auth                |
| ------------- | ---- | ----------------------------- | ------------------------------ | ------------------- |
| Register      | POST | `/locationHistory/1/register` | key, secret (body)             | API Key             |
| List Settings | GET  | `/locationHistory/1/settings` | key                            | API Key             |
| Set Settings  | PUT  | `/locationHistory/1/settings` | key, adminKey, settings (body) | API Key + Admin Key |

---

## Notifications API - Configuration

| Endpoint      | HTTP | URL Pattern                 | Key Parameters       | Auth    |
| ------------- | ---- | --------------------------- | -------------------- | ------- |
| List Settings | GET  | `/notifications/1/settings` | key                  | API Key |
| Set Settings  | PUT  | `/notifications/1/settings` | key, settings (body) | API Key |

---

## Notifications API - Contact Groups

| Endpoint             | HTTP   | URL Pattern                         | Key Parameters                        | Max                | Auth    |
| -------------------- | ------ | ----------------------------------- | ------------------------------------- | ------------------ | ------- |
| Create Contact Group | POST   | `/notifications/1/groups`           | key, name, webhookUrls, emails (body) | 20 URLs, 20 emails | API Key |
| List Contact Groups  | GET    | `/notifications/1/groups`           | key, maxResults, pageNumber           | 100/page           | API Key |
| Get Group Details    | GET    | `/notifications/1/groups/{groupId}` | key, groupId                          | -                  | API Key |
| Edit Contact Group   | PUT    | `/notifications/1/groups/{groupId}` | key, groupId, full body               | 20 URLs, 20 emails | API Key |
| Partial Edit Group   | PATCH  | `/notifications/1/groups/{groupId}` | key, groupId, partial body            | -                  | API Key |
| Delete Contact Group | DELETE | `/notifications/1/groups/{groupId}` | key, groupId                          | -                  | API Key |

**POST/PUT Body:**

```json
{
  "name": "string (max 255)",
  "webhookUrls": ["urls (max 20)"],
  "emails": ["emails (max 20)"]
}
```

**Query Params:** `maxResults` (1-100, default 100), `pageNumber` (≥1, default 1)

---

## Notifications API - History

| Endpoint                   | HTTP   | URL Pattern                | Key Parameters                        | Auth    |
| -------------------------- | ------ | -------------------------- | ------------------------------------- | ------- |
| List Notifications History | GET    | `/notifications/1/history` | key, from, to, maxResults, pageNumber | API Key |
| Clear History              | DELETE | `/notifications/1/history` | key, before                           | API Key |

**Query Params:** `from` (ISO 8601, required), `to` (ISO 8601), `maxResults` (1-100, default 100), `pageNumber` (≥1, default 1), `before` (ISO 8601, DELETE only)

**Retention:** 7 days (auto-deleted)

---

## Complete URL Template

```
Base: https://api.tomtom.com

Full URL: https://api.tomtom.com{endpoint}?key={API_KEY}&{otherParams}
```

**Regional Alternative:** `https://kr-api.tomtom.com` (Korea)

---

## Authentication Types

### API Key Authentication

```
Parameter: key={YOUR_API_KEY}
Used by: All endpoints
Generated: TomTom Developer Portal
Scope: Can restrict to specific products
```

### Admin Key Authentication

```
Parameter: adminKey={YOUR_ADMIN_KEY}
Used by: Geofencing and Location History management endpoints
Generated: POST to /register endpoint
Required for: Create, Edit, Delete operations
```

---

## Request/Response Data Formats

### Coordinates (All APIs)

```
Format: longitude,latitude[,altitude]
Projection: WGS84 (EPSG:4326)
Example: 4.8432,52.3745,100
```

### Timestamps (All APIs)

```
Format: ISO 8601
Pattern: YYYY-MM-DDThh:mm:ss[Z]
Example: 2024-03-14T14:30:45Z
```

### GeoJSON Geometry (Location History, Geofencing)

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point|LineString|Polygon",
    "coordinates": [[lon, lat, alt], ...]
  },
  "properties": { ... }
}
```

### Pagination

```
maxResults: 1-100 (default: 100)
pageNumber: ≥1 (default: 1)
Returns: itemsCount in resultInfo
```

---

## HTTP Status Codes Summary

| Code | Meaning      | Typical Causes                              |
| ---- | ------------ | ------------------------------------------- |
| 200  | OK           | Successful GET/PUT                          |
| 201  | Created      | Successful POST (resource created)          |
| 204  | No Content   | Successful DELETE                           |
| 400  | Bad Request  | Invalid parameters, missing required fields |
| 401  | Unauthorized | Invalid/missing API Key                     |
| 403  | Forbidden    | Invalid Admin Key, insufficient permissions |
| 404  | Not Found    | Resource doesn't exist                      |
| 500  | Server Error | API server error                            |

---

## Rate Limits & Constraints

| Constraint                    | Limit                 |
| ----------------------------- | --------------------- |
| Incident IDs (POST)           | 100 max               |
| Incident IDs (GET)            | 5 max                 |
| Webhooks per Contact Group    | 20 max                |
| Emails per Contact Group      | 20 max                |
| Time Range (Position History) | 24 hours max          |
| Results per Page              | 100 max (default 100) |
| Contact Group Name            | 255 characters max    |

---

## Data Retention Periods

| Data Type            | Retention Period                   |
| -------------------- | ---------------------------------- |
| Traffic Data         | Updated every minute               |
| Location History     | 3 months active + 6 months archive |
| Transition Records   | 3 months active + 6 months archive |
| Notification History | 7 days (auto-deleted)              |

---

## Service Lifecycle Status

| Service               | Status             | Notes                          |
| --------------------- | ------------------ | ------------------------------ |
| Traffic Flow API      | ✓ Active           | Updated every minute           |
| Traffic Incidents API | ✓ Active           | Updated every minute           |
| Geofencing API        | ⚠️ Deprecating     | 12-month deprecation period    |
| Location History API  | ✓ Active           | Shares objects with Geofencing |
| Notifications API     | ⚠️ Decommissioning | End date: January 31, 2027     |

---

## Quick Start Example

### 1. Get Traffic Flow Data

```
GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=YOUR_API_KEY&point=52.41072,4.84239
```

### 2. Get Traffic Incidents

```
GET https://api.tomtom.com/traffic/services/5/incidentDetails?key=YOUR_API_KEY&bbox=4.8396,52.3602,4.8951,52.3891
```

### 3. Create Geofencing Project & Register

```
POST https://api.tomtom.com/geofencing/1/register?key=YOUR_API_KEY
Body: { "secret": "your_secret" }
```

### 4. Create Object

```
POST https://api.tomtom.com/geofencing/1/objects?key=YOUR_API_KEY&adminKey=YOUR_ADMIN_KEY
Body: { "name": "Vehicle-001", "defaultProject": "project_uuid" }
```

### 5. Send Position

```
POST https://api.tomtom.com/locationHistory/1/history/positions?key=YOUR_API_KEY
Body: {
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [4.8432, 52.3745] },
  "object": "object_uuid",
  "timestamp": "2024-03-14T14:30:45"
}
```

### 6. Create Notification Contact Group

```
POST https://api.tomtom.com/notifications/1/groups?key=YOUR_API_KEY
Body: {
  "name": "Alerts",
  "webhookUrls": ["https://example.com/webhook"],
  "emails": ["admin@example.com"]
}
```

---

## Reference Documentation

For complete details, see the detailed API_RESEARCH.md file or visit:

- [TomTom Developer Portal](https://developer.tomtom.com)
- [Traffic API Documentation](https://developer.tomtom.com/traffic-api/documentation)
- [Geofencing API Documentation](https://developer.tomtom.com/geofencing-api/documentation)
- [Location History API Documentation](https://developer.tomtom.com/location-history-api/documentation)
- [Notifications API Documentation](https://developer.tomtom.com/notifications-api/documentation)
- [API Explorer](https://developer.tomtom.com/traffic-api/api-explorer)
