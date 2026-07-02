# TomTom APIs - Quick Reference Index

## API Documentation Overview

This directory contains comprehensive research on TomTom APIs used for the Slates integration.

### Files

- **SPEC.md** - General specification and feature overview of TomTom services
- **API_RESEARCH.md** - Detailed endpoint specifications with exact URL patterns, parameters, and request/response formats

---

## Quick Navigation

### 1. Traffic Flow API

**File:** API_RESEARCH.md - Section 1

**Key Endpoint:**

- Flow Segment Data: `GET /traffic/services/4/flowSegmentData/{style}/{zoom}/{format}`

**Parameters:** point, style, zoom, format, unit, thickness, openLr

**Use Case:** Get real-time traffic speed and travel time data for specific coordinates

---

### 2. Traffic Incidents API

**File:** API_RESEARCH.md - Section 2

**Key Endpoints:**

- Incident Details: `GET/POST /traffic/services/5/incidentDetails`

**Parameters:** bbox (or ids), language, categoryFilter, timeValidityFilter

**Use Case:** Retrieve information about traffic jams, accidents, and incidents in a specific area

---

### 3. Geofencing API

**File:** API_RESEARCH.md - Section 3

**Key Endpoints:**

- List Projects: `GET /geofencing/1/projects`
- Get Project Details: `GET /geofencing/1/projects/{projectId}`
- Get Fence Details: `GET /geofencing/1/fences/{fenceId}`
- Report: `GET/POST /geofencing/1/report/{projectId}`
- List Objects: `GET /geofencing/1/objects`
- Create Object: `POST /geofencing/1/objects`
- Edit Object: `PUT /geofencing/1/objects/{objectId}`
- Delete Object: `DELETE /geofencing/1/objects/{objectId}`

**Auth:** Requires both API Key and Admin Key

**Use Case:** Create and manage virtual fences, track objects against fences, detect entries/exits

---

### 4. Location History API

**File:** API_RESEARCH.md - Section 4

**Key Endpoints:**

- Send Position: `POST /locationHistory/1/history/positions`
- Get Position History: `GET /locationHistory/1/history/positions/{objectId}`
- Last Position: `GET /locationHistory/1/history/positions/{objectId}/latest`

**Auth:** Requires both API Key and Admin Key

**Use Case:** Track object locations over time, retrieve historical position data, get latest position

**Data Retention:** 3 months active, 6 months archive

---

### 5. Notifications API

**File:** API_RESEARCH.md - Section 5

**Key Endpoints:**

- List Settings: `GET /notifications/1/settings`
- Create Contact Group: `POST /notifications/1/groups`
- List Contact Groups: `GET /notifications/1/groups`
- Get Group Details: `GET /notifications/1/groups/{groupId}`
- Edit Group: `PUT /notifications/1/groups/{groupId}`
- Partial Edit Group: `PATCH /notifications/1/groups/{groupId}`
- Delete Group: `DELETE /notifications/1/groups/{groupId}`
- List History: `GET /notifications/1/history`
- Clear History: `DELETE /notifications/1/history`

**Auth:** API Key only

**Notification Methods:** Webhooks (max 20), Emails (max 20)

**Use Case:** Create contact groups for alerts, manage notification delivery, view notification history

**Important:** Service decommissioned January 31, 2027

---

## Authentication Reference

### API Key

- Query parameter: `key=YOUR_API_KEY`
- Generate in TomTom Developer Portal
- Used for public API calls

### Admin Key

- Query parameter: `adminKey=YOUR_ADMIN_KEY`
- Required for Geofencing and Location History management
- Generated via registration endpoints

**Registration Endpoints:**

```
POST https://api.tomtom.com/geofencing/1/register?key=YOUR_API_KEY
POST https://api.tomtom.com/locationHistory/1/register?key=YOUR_API_KEY
```

---

## Base URL

All APIs use: `https://api.tomtom.com`

Alternative regional endpoint: `https://kr-api.tomtom.com` (Korea)

---

## Common Query Parameters

| Parameter  | Used By                      | Description                                   |
| ---------- | ---------------------------- | --------------------------------------------- |
| key        | All APIs                     | API Key (required)                            |
| adminKey   | Geofencing, Location History | Admin Key (management only)                   |
| from       | History, Notifications       | ISO 8601 timestamp (period start)             |
| to         | History, Notifications       | ISO 8601 timestamp (period end)               |
| maxResults | Pagination                   | Max results per page (default: 100, max: 100) |
| pageNumber | Pagination                   | Page number for results (default: 1)          |

---

## Data Formats

### Coordinates

- Format: `longitude,latitude[,altitude]`
- Projection: WGS84 (EPSG:4326)

### Timestamps

- Format: ISO 8601 (YYYY-MM-DDThh:mm:ss)
- Example: `2024-03-14T14:30:45`

### Geometry

- GeoJSON Feature format
- Types: Point, LineString, Polygon
- Required for Location History and Geofencing

---

## HTTP Methods

| Method | Purpose                              |
| ------ | ------------------------------------ |
| GET    | Retrieve data, list resources        |
| POST   | Create new resources, submit queries |
| PUT    | Replace entire resource              |
| PATCH  | Partially update resource            |
| DELETE | Remove resource                      |

---

## Common HTTP Status Codes

| Code | Meaning                          |
| ---- | -------------------------------- |
| 200  | OK                               |
| 201  | Created                          |
| 204  | No Content (successful deletion) |
| 400  | Bad Request                      |
| 401  | Unauthorized (invalid API key)   |
| 403  | Forbidden (invalid Admin Key)    |
| 404  | Not Found                        |
| 500  | Server Error                     |

---

## Rate Limits & Constraints

- **Incident Details POST:** Max 100 IDs per request
- **Incident Details GET:** Max 5 IDs per request
- **Contact Groups:** Max 20 webhooks, 20 emails per group
- **Position History:** Max 24-hour time range per request
- **Pagination:** Default 100, max 100 results per page

---

## Data Retention Policies

| Data                 | Retention                          |
| -------------------- | ---------------------------------- |
| Traffic Data         | Updated every minute               |
| Location History     | 3 months active + 6 months archive |
| Transition Records   | 3 months active + 6 months archive |
| Notification History | 7 days (auto-deleted)              |

---

## Service Status

- **Traffic Flow API** ✓ Active
- **Traffic Incidents API** ✓ Active
- **Geofencing API** ⚠️ Deprecating (12-month deprecation period)
- **Location History API** ✓ Active
- **Notifications API** ⚠️ Decommissioning on January 31, 2027

---

## References

For complete endpoint documentation, visit:

- [TomTom Developer Portal](https://developer.tomtom.com)
- [Traffic API Documentation](https://developer.tomtom.com/traffic-api/documentation)
- [Geofencing API Documentation](https://developer.tomtom.com/geofencing-api/documentation)
- [Location History API Documentation](https://developer.tomtom.com/location-history-api/documentation)
- [Notifications API Documentation](https://developer.tomtom.com/notifications-api/documentation)
