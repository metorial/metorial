The page requires JavaScript. Let me search for more specific information about all NASA APIs available.Now let me get the full list of APIs from the NASA API docs JSON file:Let me get the raw JSON file:Now I have enough information to write the specification. Based on my research, NASA's APIs are read-only data APIs with no webhook or event subscription support.

# Slates Specification for Nasa

## Overview

NASA provides a collection of free, public REST APIs through api.nasa.gov that give access to space and Earth science data, imagery, and metadata. The NASA API is a digital interface that allows developers, researchers, students, and space enthusiasts to programmatically access NASA's extensive datasets. api.nasa.gov acts as a passthrough service that routes requests to the underlying NASA data systems.

## Authentication

NASA APIs use **API Key authentication**. The API key is passed as a query parameter (`api_key`) on each request.

- **Obtaining a key**: Visit the NASA API Portal at api.nasa.gov, complete the simple registration form, and your unique API key will be sent to your email. The key is issued through the GSA api.data.gov system.
- **Demo key**: You do not need to authenticate in order to explore the NASA data. However, if you will be intensively using the APIs, you should sign up for a NASA developer key. A `DEMO_KEY` is available for light testing.
- **Usage**: Append `api_key=YOUR_KEY` as a query parameter to any request. Example: `https://api.nasa.gov/planetary/apod?api_key=YOUR_KEY`
- Anyone can register for an api.nasa.gov key, which can be used to access data across federal agencies. No OAuth or additional scopes are required for the core NASA Open APIs.

Note: Some specialized NASA systems (e.g., NASA Earthdata) use separate authentication via OAuth2 with NASA Earthdata Login credentials, but these are outside the scope of the core api.nasa.gov platform.

## Features

### Astronomy Picture of the Day (APOD)

Delivers high-resolution images of astronomical objects with scientific explanations. Returns a daily featured image or video along with title, explanation, and metadata. Supports querying by specific date or date range.

### Near Earth Object Web Service (NeoWs)

Provides information about near-Earth asteroids, including orbits and potential hazards. Allows browsing the full asteroid dataset, searching by date range for close approach data, and looking up specific asteroids by their SPK-ID.

### Mars Rover Photos

The Mars Rover Photos endpoint allows you to access thousands of images taken by NASA's Curiosity, Opportunity, and Spirit rovers. Photos can be filtered by Martian sol (solar day), Earth date, and camera type. Mission manifest data for each rover is also available.

### Earth Polychromatic Imaging Camera (EPIC)

The EPIC API gives access to the pictures taken by EPIC (Earth Polychromatic Imaging Camera) onboard NOAA's DSCOVR (Deep Space Climate Observatory). Provides daily full-disc imagery of Earth in natural and enhanced color, along with image metadata.

### Earth Observatory Natural Event Tracker (EONET)

EONET is an open-source API built to provide a curated reference of continuously updated, near real-time, natural event metadata. The metadata are accessible via web services that link natural events to thematically-related image sources. Events can be filtered by category (e.g., wildfires, storms, volcanoes), status (open/closed), source, and date range.

### Space Weather (DONKI)

The Space Weather Database Of Notifications, Knowledge, Information (DONKI) is a comprehensive online tool for space weather forecasters, scientists, and the general space science community. Events include Solar Flare (FLR), Solar Energetic Particle (SEP), Coronal Mass Ejection (CME) plus its analysis information, Interplanetary Shock (IPS), Magnetopause Crossing (MPC), Geomagnetic Storm (GST), Radiation Belt Enhancement (RBE), and High Speed Stream (HSS). All sub-services support filtering by date range.

### Earth Imagery

The Earth Imagery endpoint offers satellite images of Earth from various NASA Earth observation missions. Retrieve satellite imagery for specific geographic coordinates and dates.

### NASA Image and Video Library

Browse and search through a collection of images and videos by NASA. Supports keyword search with filters for center, media type, date range, location, photographer, and more. Also provides asset and metadata retrieval for specific items.

### Two-Line Element Sets (TLE)

The TLE API provides up-to-date two-line element set records, the data is updated daily from CelesTrak and served in JSON format. A two-line element set (TLE) is a data format encoding a list of orbital elements of an Earth-orbiting object for a given point in time. Supports searching by satellite name or number.

### TechPort

The NASA TechPort system provides an API to make technology project data available in a machine-readable format. This API can be used to export TechPort data into either an XML or a JSON format. Retrieve details about NASA technology development projects, filterable by project ID or last-updated date.

### GeneLab

GeneLab lets your application access NASA's open bioscience data, including full text search. Search and retrieve space biology and genomics experiment data.

### Exoplanet Archive

The Exoplanet Archive API exposes NASA's archive data on confirmed planets, Kepler info, and transit surveys.

### Solar System Dynamics (SSD/CNEOS)

The SSD and CNEOS APIs let you build data regarding orbit, physical characteristics, and discovery circumstances into your projects. Includes APIs for close approach data, fireballs, small body lookups, and mission design.

## Events

The provider does not support events. NASA's Open APIs are read-only data retrieval services with no webhook subscriptions or built-in push notification mechanisms.
