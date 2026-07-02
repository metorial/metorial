# TomTom APIs Documentation

Comprehensive research and documentation for TomTom APIs including exact endpoint specifications, parameters, authentication, and request/response formats.

## Documentation Files

### 1. **API_RESEARCH.md** (32 KB) - Complete Reference

The most comprehensive document containing:

- Detailed specifications for all 5 APIs
- Complete endpoint URLs and patterns
- All query parameters with types and descriptions
- Request and response body examples
- HTTP status codes
- Authentication requirements
- Data retention policies
- Rate limits and constraints

**Use this for:** Development integration, detailed implementation reference, exact parameter specifications

**Sections:**

1. Traffic Flow API - Flow Segment Data endpoint
2. Traffic Incidents API - Incident Details endpoint
3. Geofencing API - Projects, Fences, Objects, Report services
4. Location History API - Position History, Configuration services
5. Notifications API - Configuration, Contact Groups, History services

---

### 2. **ENDPOINTS_SUMMARY.md** (12 KB) - Quick Reference Tables

Quick lookup tables for all endpoints with:

- Endpoint names and HTTP methods
- URL patterns
- Key parameters
- Authentication types
- Rate limits per endpoint
- Service status and lifecycle
- Common examples

**Use this for:** Quick reference during development, API explorer, endpoint lookup

**Includes:**

- Complete endpoints summary table
- Authentication summary
- Request/response formats
- HTTP status codes
- Rate limits table
- Quick start examples

---

### 3. **API_INDEX.md** (8 KB) - Navigation Guide

Quick navigation and overview of all APIs:

- One-page index of all endpoints
- Key endpoints for each API
- Authentication reference
- Common parameters across APIs
- Data formats and standards
- Service status

**Use this for:** Onboarding, understanding API structure, finding related endpoints

---

### 4. **SPEC.md** (8 KB) - General Overview

General specification and feature overview:

- TomTom service overview
- Authentication methods
- Feature descriptions
- Event-driven capabilities
- Geofence alerts and webhooks

**Use this for:** Understanding overall architecture, event systems, general TomTom capabilities

---

## Research Summary

### APIs Covered

#### 1. Traffic Flow API

- **Purpose:** Real-time traffic speed and travel time data
- **Key Endpoint:** `GET /traffic/services/4/flowSegmentData/{style}/{zoom}/{format}`
- **Parameters:** point, style, zoom, format, unit, thickness
- **Updates:** Every minute from 650M+ GPS devices
- **Status:** Active

#### 2. Traffic Incidents API

- **Purpose:** Traffic jams, accidents, incidents, and delays
- **Key Endpoint:** `GET/POST /traffic/services/5/incidentDetails`
- **Parameters:** bbox (or up to 100 incident IDs via POST)
- **Details:** Start/end location, road name, delay type, significance, distance
- **Updates:** Every minute
- **Status:** Active

#### 3. Geofencing API

- **Purpose:** Virtual fences, object tracking, transition detection
- **Key Endpoints:**
  - Projects: List, Get, Edit
  - Fences: CRUD operations
  - Objects: CRUD operations
  - Report: Inside/outside/near fences with distances
- **Authentication:** API Key + Admin Key
- **Transitions:** Detects object entries/exits through fences
- **Data Retention:** 3 months active, 6 months archive
- **Status:** ⚠️ Deprecating (12-month deprecation period)

#### 4. Location History API

- **Purpose:** Track object locations over time
- **Key Endpoints:**
  - Send Position: `POST /locationHistory/1/history/positions`
  - Get Position History: `GET /locationHistory/1/history/positions/{objectId}`
  - Last Position: `GET /locationHistory/1/history/positions/{objectId}/latest`
- **Authentication:** API Key + Admin Key
- **Data Fields:** Timestamp, speed, direction, altitude
- **Data Retention:** 3 months active, 6 months archive
- **Shares Objects:** With Geofencing API
- **Status:** Active

#### 5. Notifications API

- **Purpose:** Manage alert delivery via webhooks and email
- **Key Endpoints:**
  - Contact Groups: CRUD operations
  - Notification History: List and clear
  - Settings: Get and set configuration
- **Contact Methods:** Webhooks (max 20), Emails (max 20) per group
- **History Retention:** 7 days (auto-deleted)
- **Status:** ⚠️ Decommissioning on January 31, 2027

---

## Quick Start

### 1. Authentication Setup

```bash
# Register for Geofencing (get Admin Key)
POST https://api.tomtom.com/geofencing/1/register?key=YOUR_API_KEY
Body: { "secret": "your_secret" }

# Register for Location History
POST https://api.tomtom.com/locationHistory/1/register?key=YOUR_API_KEY
Body: { "secret": "your_secret" }
```

### 2. Get Traffic Data

```bash
# Traffic Flow
curl "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=YOUR_API_KEY&point=52.41072,4.84239"

# Traffic Incidents
curl "https://api.tomtom.com/traffic/services/5/incidentDetails?key=YOUR_API_KEY&bbox=4.8396,52.3602,4.8951,52.3891"
```

### 3. Create Geofence

```bash
# List projects
curl "https://api.tomtom.com/geofencing/1/projects?key=YOUR_API_KEY"

# Create object
curl -X POST "https://api.tomtom.com/geofencing/1/objects?key=YOUR_API_KEY&adminKey=YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Vehicle-001","defaultProject":"project_uuid"}'

# Get fence details
curl "https://api.tomtom.com/geofencing/1/fences/fence_uuid?key=YOUR_API_KEY"

# Report (check position against fences)
curl "https://api.tomtom.com/geofencing/1/report/project_uuid?key=YOUR_API_KEY&point=4.8432,52.3745&object=object_uuid"
```

### 4. Track Location

```bash
# Send position
curl -X POST "https://api.tomtom.com/locationHistory/1/history/positions?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type":"Feature",
    "geometry":{"type":"Point","coordinates":[4.8432,52.3745]},
    "object":"object_uuid",
    "timestamp":"2024-03-14T14:30:45"
  }'

# Get position history
curl "https://api.tomtom.com/locationHistory/1/history/positions/object_uuid?key=YOUR_API_KEY&adminKey=YOUR_ADMIN_KEY&from=2024-03-10T00:00:00&to=2024-03-14T23:59:59"
```

### 5. Send Notifications

```bash
# Create contact group
curl -X POST "https://api.tomtom.com/notifications/1/groups?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Alerts",
    "webhookUrls":["https://example.com/webhook"],
    "emails":["admin@example.com"]
  }'

# List notifications history
curl "https://api.tomtom.com/notifications/1/history?key=YOUR_API_KEY&from=2024-03-10T00:00:00"
```

---

## Key Specifications

### Coordinate System

- **Projection:** WGS84 (EPSG:4326)
- **Format:** longitude,latitude[,altitude]
- **Example:** 4.8432,52.3745,100

### Timestamp Format

- **Standard:** ISO 8601
- **Pattern:** YYYY-MM-DDThh:mm:ss[Z]
- **Example:** 2024-03-14T14:30:45Z

### Base URL

- **Production:** `https://api.tomtom.com`
- **Korea Region:** `https://kr-api.tomtom.com`

### Authentication

- **API Key:** Query parameter `key=YOUR_API_KEY` (required for all)
- **Admin Key:** Query parameter `adminKey=YOUR_ADMIN_KEY` (required for management)

### Pagination

- **Default:** 100 results per page
- **Max:** 100 results per page
- **Parameters:** `maxResults` (1-100), `pageNumber` (≥1)

---

## Rate Limits

| API                  | Limit               |
| -------------------- | ------------------- |
| Incident IDs (POST)  | 100 max per request |
| Incident IDs (GET)   | 5 max per request   |
| Webhooks per Group   | 20 max              |
| Emails per Group     | 20 max              |
| Time Range (History) | 24 hours max        |
| Results per Page     | 100 max             |

---

## Data Retention

| Data Type            | Retention                          |
| -------------------- | ---------------------------------- |
| Traffic Updates      | Every minute                       |
| Location History     | 3 months active + 6 months archive |
| Transitions          | 3 months active + 6 months archive |
| Notification History | 7 days (auto-deleted)              |

---

## Service Status

| Service               | Status             | Notes                 |
| --------------------- | ------------------ | --------------------- |
| Traffic Flow API      | ✓ Active           | -                     |
| Traffic Incidents API | ✓ Active           | -                     |
| Geofencing API        | ⚠️ Deprecating     | 12-month deprecation  |
| Location History API  | ✓ Active           | -                     |
| Notifications API     | ⚠️ Decommissioning | End: January 31, 2027 |

---

## HTTP Status Codes

| Code | Meaning                            |
| ---- | ---------------------------------- |
| 200  | OK (successful GET/PUT)            |
| 201  | Created (successful POST)          |
| 204  | No Content (successful DELETE)     |
| 400  | Bad Request (invalid parameters)   |
| 401  | Unauthorized (invalid API key)     |
| 403  | Forbidden (invalid Admin Key)      |
| 404  | Not Found (resource doesn't exist) |
| 500  | Server Error                       |

---

## Official References

- [TomTom Developer Portal](https://developer.tomtom.com)
- [Traffic API Documentation](https://developer.tomtom.com/traffic-api/documentation)
- [Geofencing API Documentation](https://developer.tomtom.com/geofencing-api/documentation)
- [Location History API Documentation](https://developer.tomtom.com/location-history-api/documentation)
- [Notifications API Documentation](https://developer.tomtom.com/notifications-api/documentation)
- [API Explorer](https://developer.tomtom.com/traffic-api/api-explorer)

---

## Document Versions

- **Created:** March 14, 2024
- **Research Date:** March 14, 2024
- **Last Updated:** March 14, 2024
- **API Versions Covered:**
  - Traffic Flow API v4
  - Traffic Incidents API v5
  - Geofencing API v1
  - Location History API v1
  - Notifications API v1

---

## Navigation

**Quick Navigation:**

- Start here: [API_INDEX.md](API_INDEX.md)
- Detailed reference: [API_RESEARCH.md](API_RESEARCH.md)
- Quick lookup: [ENDPOINTS_SUMMARY.md](ENDPOINTS_SUMMARY.md)
- General info: [SPEC.md](SPEC.md)
