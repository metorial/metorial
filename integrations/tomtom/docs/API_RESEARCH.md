# TomTom APIs Research - Detailed Endpoint Specifications

This document contains comprehensive research on TomTom APIs including exact URL patterns, query parameters, request/response formats, and authentication requirements.

---

## 1. Traffic Flow API

The Traffic Flow API provides real-time observed speeds and travel times for all key roads in a network. Updated every minute with current traffic data from over 650 million GPS-enabled devices.

### Flow Segment Data Endpoint

**Purpose:** Get traffic flow data for the road closest to given coordinates.

**URL Pattern:**

```
https://api.tomtom.com/traffic/services/{versionNumber}/flowSegmentData/{style}/{zoom}/{format}
```

**HTTP Method:** GET

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| versionNumber | Yes | `4` | API version |
| style | Yes | `absolute`, `relative`, `relative0`, `relative0-dark`, `relative-delay`, `reduced-sensitivity` | Traffic visualization style |
| zoom | Yes | `0-22` | Map zoom level |
| format | Yes | `xml`, `json`, `jsonp` | Response format |

**Query Parameters:**
| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| key | Yes | string | - | Your API Key |
| point | Yes | string | - | Coordinates: `latitude,longitude` (WGS84/EPSG:4326) |
| unit | No | string | `kmph` | Speed unit: `kmph` or `mph` |
| thickness | No | integer | 10 | Line thickness: 1-20 |
| openLr | No | boolean | false | Include OpenLR code in response |
| jsonp | No | string | - | JSONP callback method name (for jsonp format only) |

**Example Request:**

```
GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=YOUR_API_KEY&point=52.41072,4.84239&unit=kmph
```

**Response Body (JSON):**

```json
{
  "flowSegmentData": {
    "frc": "FRC2",
    "currentSpeed": 65,
    "freeFlowSpeed": 90,
    "currentTravelTime": 240,
    "freeFlowTravelTime": 160,
    "confidence": 0.95,
    "roadClosure": false,
    "coordinates": [
      {
        "latitude": 52.41072,
        "longitude": 4.84239
      }
    ]
  }
}
```

**Response Fields:**

- `frc`: Functional Road Class (FRC0-FRC7)
- `currentSpeed`: Current average speed in specified unit
- `freeFlowSpeed`: Speed under ideal conditions
- `currentTravelTime`: Estimated travel time in seconds
- `freeFlowTravelTime`: Travel time in ideal conditions
- `confidence`: Quality measure (0-1)
- `roadClosure`: Boolean indicating if road is closed
- `coordinates`: Array of location coordinates

**HTTP Status Codes:**

- 200: OK
- 400: Bad request (missing required parameters)
- 401: Unauthorized (invalid API key)
- 404: Not found

---

## 2. Traffic Incidents API

The Traffic Incidents API provides information about traffic jams, incidents, congestion, and delays within a given area. Updated every minute.

### Incident Details Endpoint

**Purpose:** Get detailed information about traffic incidents in a bounding box or by specific incident IDs.

**URL Pattern:**

```
https://api.tomtom.com/traffic/services/{versionNumber}/incidentDetails
```

**HTTP Methods:** GET (with bbox or up to 5 IDs) or POST (with up to 100 IDs)

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| versionNumber | Yes | `5` | API version |

**Query Parameters:**
| Parameter | Required | Type | Description | GET/POST |
|-----------|----------|------|-------------|----------|
| key | Yes | string | Your API Key | Both |
| bbox | Yes* | string | Bounding box: `minLon,minLat,maxLon,maxLat` | GET only |
| ids | Yes* | string/array | Incident IDs (max 5 GET, max 100 POST) | Both |
| fields | No | string | Response fields to include | Both |
| language | No | string | Language code (default: `en-GB`) | Both |
| t | No | string | Traffic Model ID for data synchronization | Both |
| categoryFilter | No | string | Incident types (0-11, 14) | Both |
| timeValidityFilter | No | string | `present` or `future` | Both |

\*Either bbox or ids is required

**Example GET Request:**

```
GET https://api.tomtom.com/traffic/services/5/incidentDetails?key=YOUR_API_KEY&bbox=4.8396,52.3602,4.8951,52.3891&language=en-GB
```

**Example POST Request:**

```
POST https://api.tomtom.com/traffic/services/5/incidentDetails?key=YOUR_API_KEY&language=en-GB

Request Body:
{
  "ids": ["incident_id_1", "incident_id_2", "incident_id_3"]
}
```

**Response Body (JSON):**

```json
{
  "incidents": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [4.8432, 52.3745]
      },
      "properties": {
        "id": "incident_uuid",
        "iconCategory": 5,
        "magnitudeOfDelay": 10,
        "events": [
          {
            "description": "Heavy traffic due to accident",
            "code": 1020
          }
        ],
        "startTime": "2024-03-14T10:30:00+00:00",
        "endTime": "2024-03-14T12:00:00+00:00",
        "from": "Main Street",
        "to": "Park Avenue",
        "roadNumbers": ["A10"],
        "length": 1500,
        "delay": 300,
        "roadClosed": false
      }
    }
  ]
}
```

**Response Fields (properties object):**

- `id`: Unique incident identifier
- `iconCategory`: Incident type (0-14)
- `magnitudeOfDelay`: Estimated delay in minutes
- `events`: Array of event descriptions and codes
- `startTime`: ISO 8601 timestamp
- `endTime`: ISO 8601 timestamp
- `from`: Start location description
- `to`: End location description
- `roadNumbers`: Affected road identifiers
- `length`: Incident extent in meters
- `delay`: Delay duration in seconds
- `roadClosed`: Boolean indicating if road is closed

**HTTP Status Codes:**

- 200: OK
- 400: Bad request
- 401: Unauthorized
- 404: Not found

---

## 3. Geofencing API

The Geofencing API allows you to define virtual barriers (fences) and determine if tracked objects are inside, outside, or near them.

### Projects Service

#### List Projects Endpoint

**Purpose:** Retrieve all projects associated with the account.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/projects
```

**HTTP Method:** GET

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Example Request:**

```
GET https://api.tomtom.com/geofencing/1/projects?key=YOUR_API_KEY
```

**Response Body (JSON):**

```json
{
  "projects": [
    {
      "id": "project_uuid_1",
      "name": "Fleet Management"
    },
    {
      "id": "project_uuid_2",
      "name": "Delivery Routes"
    }
  ]
}
```

**HTTP Status Codes:**

- 200: OK
- 400: Bad request
- 401: Unauthorized

---

#### Get Project Details Endpoint

**Purpose:** Retrieve all fences and details for a specific project.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/projects/{projectId}
```

**HTTP Method:** GET

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| projectId | Yes | UUID | The project identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Example Request:**

```
GET https://api.tomtom.com/geofencing/1/projects/project_uuid?key=YOUR_API_KEY
```

**Response Body (JSON):**

```json
{
  "id": "project_uuid",
  "name": "Fleet Management",
  "fences": [
    {
      "id": "fence_uuid",
      "name": "Warehouse Zone",
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [4.8432, 52.3745],
        "radius": 500
      }
    }
  ]
}
```

**HTTP Status Codes:**

- 200: OK
- 404: Project not found
- 401: Unauthorized

---

### Fences Service

#### Get Fence Details Endpoint

**Purpose:** Retrieve all details for a specific fence.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/fences/{fenceId}
```

**HTTP Method:** GET

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| fenceId | Yes | UUID | The fence identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |
| showGeoJson | No | boolean | Include GeoJSON representation (default: false) |

**Example Request:**

```
GET https://api.tomtom.com/geofencing/1/fences/fence_uuid?key=YOUR_API_KEY&showGeoJson=true
```

**Response Body (JSON):**

```json
{
  "id": "fence_uuid",
  "name": "Warehouse Zone",
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [4.8432, 52.3745],
    "radius": 500,
    "shapeType": "Circle"
  },
  "properties": {
    "customAttribute1": "value1",
    "customAttribute2": "value2"
  }
}
```

**Response Fields:**

- `id`: Fence identifier
- `name`: Fence name
- `type`: GeoJSON type (always "Feature")
- `geometry.type`: Shape type (Point, LineString, Polygon)
- `geometry.coordinates`: [longitude, latitude]
- `geometry.radius`: Radius in meters (for circles)
- `geometry.shapeType`: Shape description
- `properties`: Custom fence attributes

**HTTP Status Codes:**

- 200: OK
- 404: Fence not found
- 401: Unauthorized

---

### Report Service

#### Report Request Endpoint

**Purpose:** Get a report of which fences an object is inside/outside, with optional transition detection.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/report/{projectId}
```

**HTTP Methods:** GET or POST

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| projectId | Yes | UUID | The project identifier |

**Query Parameters:**
| Parameter | Required | Type | Description | GET/POST |
|-----------|----------|------|-------------|----------|
| key | Yes | string | Your API Key | Both |
| point | Yes | string | Coordinates: `longitude,latitude[,altitude]` | Both |
| object | No | UUID | Object ID for transition detection | Both |
| range | No | integer | Search radius in meters (0-100,000) | Both |
| projectId | No | UUID | Override project (path param preferred) | Both |
| timestamp | No | ISO 8601 | Report timestamp (POST only) | POST |

**Example GET Request:**

```
GET https://api.tomtom.com/geofencing/1/report/project_uuid?key=YOUR_API_KEY&point=4.8432,52.3745,100&object=object_uuid&range=0
```

**Example POST Request:**

```
POST https://api.tomtom.com/geofencing/1/report/project_uuid?key=YOUR_API_KEY&point=4.8432,52.3745,100&object=object_uuid

No request body required.
```

**Response Body (JSON):**

```json
{
  "summary": {
    "project": "project_uuid",
    "type": "Point",
    "coordinates": [4.8432, 52.3745, 100],
    "range": 0
  },
  "inside": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "fence_uuid",
        "properties": {
          "name": "Warehouse Zone",
          "distance": 0,
          "nearestBorderPoint": [4.8432, 52.3745]
        }
      }
    ]
  },
  "outside": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "id": "fence_uuid_2",
        "properties": {
          "name": "Service Area",
          "distance": 1500,
          "nearestBorderPoint": [4.85, 52.38]
        }
      }
    ]
  }
}
```

**HTTP Status Codes:**

- 200: OK
- 400: Bad request
- 401: Unauthorized
- 404: Project not found

---

### Objects Service

#### List Objects Endpoint

**Purpose:** Get a list of all tracked objects in the account.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/objects
```

**HTTP Method:** GET

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Example Request:**

```
GET https://api.tomtom.com/geofencing/1/objects?key=YOUR_API_KEY
```

**Response Body (JSON):**

```json
{
  "objects": [
    {
      "id": "object_uuid_1",
      "name": "Vehicle-001"
    },
    {
      "id": "object_uuid_2",
      "name": "Vehicle-002"
    }
  ]
}
```

---

#### Get Object Details Endpoint

**Purpose:** Retrieve all details for a specific object.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/objects/{objectId}
```

**HTTP Method:** GET

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| objectId | Yes | UUID | The object identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Example Request:**

```
GET https://api.tomtom.com/geofencing/1/objects/object_uuid?key=YOUR_API_KEY
```

**Response Body (JSON):**

```json
{
  "id": "object_uuid",
  "name": "Vehicle-001",
  "defaultProject": "project_uuid",
  "properties": {
    "licensePlate": "ABC-123",
    "driver": "John Doe"
  }
}
```

---

#### Create Object Endpoint

**Purpose:** Create a new tracked object.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/objects
```

**HTTP Method:** POST

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |
| adminKey | Yes | string | Your Admin Key |

**Request Body (JSON):**

```json
{
  "name": "Vehicle-001",
  "defaultProject": "project_uuid",
  "properties": {
    "licensePlate": "ABC-123",
    "driver": "John Doe",
    "customField": "customValue"
  }
}
```

**Response Body (JSON):**

```json
{
  "id": "object_uuid",
  "name": "Vehicle-001",
  "defaultProject": "project_uuid",
  "properties": {
    "licensePlate": "ABC-123",
    "driver": "John Doe",
    "customField": "customValue"
  }
}
```

**HTTP Status Codes:**

- 201: Created
- 400: Bad request
- 401: Unauthorized

---

#### Edit Object Endpoint

**Purpose:** Update an existing object's attributes.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/objects/{objectId}
```

**HTTP Method:** PUT

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| objectId | Yes | UUID | The object identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |
| adminKey | Yes | string | Your Admin Key |

**Request Body (JSON):**

```json
{
  "name": "Vehicle-001-Updated",
  "properties": {
    "licensePlate": "XYZ-789",
    "driver": "Jane Smith"
  }
}
```

**Response Body:** Same as Get Object Details

---

#### Delete Object Endpoint

**Purpose:** Remove a tracked object.

**URL Pattern:**

```
https://api.tomtom.com/geofencing/1/objects/{objectId}
```

**HTTP Method:** DELETE

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| objectId | Yes | UUID | The object identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |
| adminKey | Yes | string | Your Admin Key |

**Example Request:**

```
DELETE https://api.tomtom.com/geofencing/1/objects/object_uuid?key=YOUR_API_KEY&adminKey=YOUR_ADMIN_KEY
```

**HTTP Status Codes:**

- 204: No Content (successful deletion)
- 404: Object not found
- 401: Unauthorized

---

## 4. Location History API

The Location History API tracks and manages the locations of multiple objects over time. It shares data with the Geofencing API.

### Authentication

Requires both API Key and Admin Key.

**Register/Configure Admin Key:**

```
POST https://api.tomtom.com/locationHistory/1/register?key=YOUR_API_KEY
{
  "secret": "your_secret_phrase"
}
```

Returns Admin Key for use in subsequent requests.

---

### Position History Service

#### Send Position Endpoint

**Purpose:** Report an object's current location.

**URL Pattern:**

```
https://api.tomtom.com/locationHistory/1/history/positions
```

**HTTP Method:** POST

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Request Body (JSON - GeoJSON Feature):**

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [4.8432, 52.3745, 100]
  },
  "object": "object_uuid",
  "timestamp": "2024-03-14T10:30:45"
}
```

**Request Fields:**

- `type`: Always "Feature"
- `geometry.type`: Always "Point"
- `geometry.coordinates`: [longitude, latitude, altitude (optional)]
- `object`: UUID of the tracked object
- `timestamp`: ISO 8601 format (optional; defaults to server time)

**Response:**

- Status 201: Created (no response body)
- Status 400: Bad request
- Status 403: No consent for data storage
- Status 404: Object not found

**Example Request:**

```
POST https://api.tomtom.com/locationHistory/1/history/positions?key=YOUR_API_KEY

{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [4.8432, 52.3745, 100]
  },
  "object": "vehicle_001_uuid",
  "timestamp": "2024-03-14T14:30:45"
}
```

**Important Note:** Before using this endpoint, customer must give consent for storing historical positions using the Configuration service "Set new settings values" endpoint.

---

#### Get Objects Position History Endpoint

**Purpose:** Retrieve historical positions for a specific object within a time range.

**URL Pattern:**

```
https://api.tomtom.com/locationHistory/1/history/positions/{objectId}
```

**HTTP Method:** GET

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| objectId | Yes | UUID | The object identifier |

**Query Parameters:**
| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| key | Yes | string | - | Your API Key |
| adminKey | Yes | string | - | Your Admin Key |
| from | Yes | ISO 8601 | - | Period start timestamp (YYYY-MM-DDThh:mm:ss) |
| to | No | ISO 8601 | - | Period end timestamp |
| maxResults | No | integer | 100 | Max results per page (1-100) |
| pageNumber | No | integer | 1 | Page number (≥1) |

**Example Request:**

```
GET https://api.tomtom.com/locationHistory/1/history/positions/object_uuid?key=YOUR_API_KEY&adminKey=YOUR_ADMIN_KEY&from=2024-03-10T00:00:00&to=2024-03-14T23:59:59&maxResults=50&pageNumber=1
```

**Response Body (JSON):**

```json
{
  "summary": {
    "objectName": "Vehicle-001",
    "objectId": "object_uuid",
    "from": "2024-03-10T00:00:00",
    "to": "2024-03-14T23:59:59"
  },
  "positions": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": {
          "type": "Point",
          "coordinates": [4.8432, 52.3745, 100]
        },
        "properties": {
          "timestamp": "2024-03-14T14:30:45",
          "userTimestamp": "2024-03-14T14:30:40",
          "estimatedSpeed": 45.5,
          "estimatedDirection": 270.5
        }
      }
    ]
  },
  "resultInfo": {
    "maxResults": 50,
    "pageNumber": 1,
    "itemsCount": 45
  }
}
```

**Response Fields:**

- `timestamp`: Server-recorded time
- `userTimestamp`: User-provided time (or server timestamp if not set)
- `estimatedSpeed`: Speed in km/h
- `estimatedDirection`: North-based azimuth in degrees (0-359)
- `coordinates`: [longitude, latitude, altitude]

**Pagination Note:** Maximum time range between timestamps is 24 hours.

**HTTP Status Codes:**

- 200: OK
- 400: Bad request (invalid date format, bad order, wrong types)
- 403: Forbidden (invalid Admin Key)
- 404: Not Found (no such object)

---

#### Last Position Endpoint

**Purpose:** Retrieve the most recent position of an object.

**URL Pattern:**

```
https://api.tomtom.com/locationHistory/1/history/positions/{objectId}/latest
```

**HTTP Method:** GET

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| objectId | Yes | UUID | The object identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |
| adminKey | Yes | string | Your Admin Key |

**Example Request:**

```
GET https://api.tomtom.com/locationHistory/1/history/positions/object_uuid/latest?key=YOUR_API_KEY&adminKey=YOUR_ADMIN_KEY
```

**Response Body (JSON):**

```json
{
  "objectId": "object_uuid",
  "objectName": "Vehicle-001",
  "position": {
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [4.8432, 52.3745, 100]
    },
    "properties": {
      "timestamp": "2024-03-14T14:30:45",
      "userTimestamp": "2024-03-14T14:30:40",
      "estimatedSpeed": 45.5,
      "estimatedDirection": 270.5
    }
  }
}
```

---

## 5. Notifications API

The Notifications API manages communication from TomTom APIs to users via webhooks and emails. **Note:** This service will be decommissioned on January 31, 2027.

### Configuration Service

#### List Current Options (Settings) Endpoint

**Purpose:** List account and privacy settings.

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/settings
```

**HTTP Method:** GET

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Example Request:**

```
GET https://api.tomtom.com/notifications/1/settings?key=YOUR_API_KEY
```

**Response Body (JSON):**

```json
{
  "privacySettings": {
    "deleteAllHistoryMessagesBefore": "2024-03-14T10:30:45Z",
    "deleteAllHistoryMessagesBeforeStatus": "PROCESSING"
  }
}
```

**Response Fields:**

- `deleteAllHistoryMessagesBefore`: ISO 8601 timestamp (only if deletion requested)
- `deleteAllHistoryMessagesBeforeStatus`: Status - "PROCESSING" or "DELETED"

**HTTP Status Codes:**

- 200: OK
- 400: Bad request (missing key)

---

### Contact Groups Service

#### Create Contact Group Endpoint

**Purpose:** Create a new contact group for notifications.

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/groups
```

**HTTP Method:** POST

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Request Body (JSON):**

```json
{
  "name": "Emergency Alerts",
  "webhookUrls": [
    "https://example.com/webhook/geofence",
    "https://backup.example.com/webhook/geofence"
  ],
  "emails": ["admin@example.com", "operations@example.com"]
}
```

**Request Constraints:**

- `name`: Optional, max 255 characters
- `webhookUrls`: Optional, max 20 URLs
- `emails`: Optional, max 20 addresses
- At least one notification method must be provided

**Response Body (JSON):**

```json
{
  "id": "group_uuid",
  "name": "Emergency Alerts",
  "webhookUrls": [
    "https://example.com/webhook/geofence",
    "https://backup.example.com/webhook/geofence"
  ],
  "emails": ["admin@example.com", "operations@example.com"]
}
```

**HTTP Status Codes:**

- 201: Created
- 400: Bad request (name too long, limit exceeded, no notification methods)

---

#### List Contact Groups Endpoint

**Purpose:** List all contact groups.

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/groups
```

**HTTP Method:** GET

**Query Parameters:**
| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| key | Yes | string | - | Your API Key |
| maxResults | No | integer | 100 | Max results per page (1-100) |
| pageNumber | No | integer | 1 | Page number (≥1) |

**Example Request:**

```
GET https://api.tomtom.com/notifications/1/groups?key=YOUR_API_KEY&maxResults=20&pageNumber=1
```

**Response Body (JSON):**

```json
{
  "groups": [
    {
      "id": "group_uuid_1",
      "name": "Emergency Alerts"
    },
    {
      "id": "group_uuid_2",
      "name": "Standard Notifications"
    }
  ],
  "resultInfo": {
    "maxResults": 20,
    "pageNumber": 1,
    "itemsCount": 2
  }
}
```

**HTTP Status Codes:**

- 200: OK
- 400: Bad request (invalid pagination)

---

#### Get Contact Group Details Endpoint

**Purpose:** Retrieve details for a specific contact group.

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/groups/{groupId}
```

**HTTP Method:** GET

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| groupId | Yes | UUID | The group identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Example Request:**

```
GET https://api.tomtom.com/notifications/1/groups/group_uuid?key=YOUR_API_KEY
```

**Response Body (JSON):**

```json
{
  "id": "group_uuid",
  "name": "Emergency Alerts",
  "webhookUrls": [
    "https://example.com/webhook/geofence",
    "https://backup.example.com/webhook/geofence"
  ],
  "emails": ["admin@example.com", "operations@example.com"]
}
```

---

#### Edit Contact Group Endpoint (Full Update)

**Purpose:** Update an entire contact group.

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/groups/{groupId}
```

**HTTP Method:** PUT

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| groupId | Yes | UUID | The group identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Request Body (JSON):**

```json
{
  "name": "Critical Alerts Updated",
  "webhookUrls": ["https://newexample.com/webhook/geofence"],
  "emails": ["newemail@example.com"]
}
```

**Response Body:** Same as Get Contact Group Details

**HTTP Status Codes:**

- 200: OK
- 400: Bad request
- 404: Group not found

---

#### Edit Contact Group Partially Endpoint

**Purpose:** Partially update a contact group (only specified fields).

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/groups/{groupId}
```

**HTTP Method:** PATCH

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| groupId | Yes | UUID | The group identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Request Body (JSON - partial):**

```json
{
  "webhookUrls": ["https://newexample.com/webhook/geofence"]
}
```

**Response Body:** Same as Get Contact Group Details

---

#### Delete Contact Group Endpoint

**Purpose:** Delete a contact group.

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/groups/{groupId}
```

**HTTP Method:** DELETE

**URL Parameters:**
| Parameter | Required | Value | Description |
|-----------|----------|-------|-------------|
| groupId | Yes | UUID | The group identifier |

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |

**Example Request:**

```
DELETE https://api.tomtom.com/notifications/1/groups/group_uuid?key=YOUR_API_KEY
```

**HTTP Status Codes:**

- 204: No Content (successful deletion)
- 404: Group not found
- 401: Unauthorized

---

### Notifications History Service

#### List Notifications History Endpoint

**Purpose:** Retrieve history of sent notifications (stored for 7 days).

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/history
```

**HTTP Method:** GET

**Query Parameters:**
| Parameter | Required | Type | Default | Description |
|-----------|----------|------|---------|-------------|
| key | Yes | string | - | Your API Key |
| from | Yes | ISO 8601 | - | Period start (YYYY-MM-DDThh:mm:ss) |
| to | No | ISO 8601 | - | Period end |
| maxResults | No | integer | 100 | Max results per page (1-100) |
| pageNumber | No | integer | 1 | Page number (≥1) |

**Example Request:**

```
GET https://api.tomtom.com/notifications/1/history?key=YOUR_API_KEY&from=2024-03-10T00:00:00&to=2024-03-14T23:59:59&maxResults=50
```

**Response Body (JSON):**

```json
{
  "summary": {
    "from": "2024-03-10T00:00:00",
    "to": "2024-03-14T23:59:59"
  },
  "notifications": [
    {
      "title": "Geofence Entry Alert",
      "body": "Vehicle-001 entered Warehouse Zone",
      "contact": {
        "type": "WEBHOOK",
        "value": "https://example.com/webhook/geofence"
      },
      "status": {
        "type": "SUCCESS",
        "details": ""
      },
      "sendDate": "2024-03-14T14:30:45Z"
    },
    {
      "title": "Geofence Exit Alert",
      "body": "Vehicle-002 exited Service Area",
      "contact": {
        "type": "EMAIL",
        "value": "admin@example.com"
      },
      "status": {
        "type": "SUCCESS",
        "details": ""
      },
      "sendDate": "2024-03-14T15:45:30Z"
    }
  ],
  "resultInfo": {
    "maxResults": 50,
    "pageNumber": 1,
    "itemsCount": 2
  }
}
```

**Response Fields:**

- `title`: Notification title
- `body`: Notification message body
- `contact.type`: "WEBHOOK" or "EMAIL"
- `contact.value`: Webhook URL or email address
- `status.type`: "SUCCESS" or "FAILURE"
- `status.details`: Error details if failed
- `sendDate`: ISO 8601 timestamp

**HTTP Status Codes:**

- 200: OK
- 400: Bad request (incorrect datetime format)

---

#### Clear Notifications History Endpoint

**Purpose:** Clear notification history before a specified date.

**URL Pattern:**

```
https://api.tomtom.com/notifications/1/history
```

**HTTP Method:** DELETE

**Query Parameters:**
| Parameter | Required | Type | Description |
|-----------|----------|------|-------------|
| key | Yes | string | Your API Key |
| before | Yes | ISO 8601 | Clear notifications before this timestamp |

**Example Request:**

```
DELETE https://api.tomtom.com/notifications/1/history?key=YOUR_API_KEY&before=2024-03-10T00:00:00
```

**HTTP Status Codes:**

- 204: No Content (successful deletion)
- 400: Bad request

---

## Authentication Summary

### API Key (Public)

- Used in query parameter: `key=YOUR_API_KEY`
- Required for most endpoints
- Generate in TomTom Developer Portal
- Can be scoped to specific products

### Admin Key (Private)

- Used in query parameter: `adminKey=YOUR_ADMIN_KEY`
- Required for management operations (create, edit, delete)
- Required for Geofencing and Location History management
- Generated via registration endpoint

**Geofencing Registration:**

```
POST https://api.tomtom.com/geofencing/1/register?key=YOUR_API_KEY
{
  "secret": "your_secret"
}
```

**Location History Registration:**

```
POST https://api.tomtom.com/locationHistory/1/register?key=YOUR_API_KEY
{
  "secret": "your_secret"
}
```

---

## Common Response Codes

| Code | Meaning                                       |
| ---- | --------------------------------------------- |
| 200  | OK - Request successful                       |
| 201  | Created - Resource created successfully       |
| 204  | No Content - Successful deletion              |
| 400  | Bad Request - Invalid parameters or format    |
| 401  | Unauthorized - Invalid API key                |
| 403  | Forbidden - No permission (invalid Admin Key) |
| 404  | Not Found - Resource doesn't exist            |
| 500  | Internal Server Error                         |

---

## Data Retention

- **Traffic Data:** Updated every minute
- **Location History:** Active for 3 months; archived for 6 months
- **Transition Data:** Active for 3 months; archived for 6 months
- **Notification History:** Stored for 7 days; auto-deleted after

---

## Rate Limits & Constraints

- Incident Details POST: Max 100 incident IDs per request
- Incident Details GET: Max 5 incident IDs per request
- Contact Groups: Max 20 webhook URLs and 20 emails per group
- Position History: Max time range between timestamps is 24 hours
- Pagination: Default 100 results, max 100 per page

---

## References

Sources:

- [Traffic Flow API Documentation](https://developer.tomtom.com/traffic-api/documentation/tomtom-maps/traffic-flow/flow-segment-data)
- [Traffic Incidents API Documentation](https://developer.tomtom.com/traffic-api/documentation/tomtom-maps/traffic-incidents/incident-details)
- [Geofencing API Introduction](https://developer.tomtom.com/geofencing-api/documentation/product-information/introduction)
- [Location History API Introduction](https://developer.tomtom.com/location-history-api/documentation/product-information/introduction)
- [Notifications API Introduction](https://developer.tomtom.com/notifications-api/documentation/product-information/introduction)
- [Contact Groups Service](https://developer.tomtom.com/notifications-api/documentation/contact-groups-service/contact-groups-service)
- [TomTom Developer Portal](https://developer.tomtom.com/)
