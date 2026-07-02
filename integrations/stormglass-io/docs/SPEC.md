# Slates Specification for Stormglass Io

## Overview

Stormglass.io is a professional global weather API that provides developers, researchers, and organizations with high-quality land-based (terrestrial), ocean and coastal weather data. The API delivers parameters such as wind, wave, currents, temperature, tides, solar data and other environmental metrics. It aggregates data from multiple trusted providers such as ECMWF, NOAA, Metoffice UK, Met.no, DWD, FMI, and other national meteorological agencies.

## Authentication

Stormglass.io uses **API Key** authentication.

Users sign up at stormglass.io/register and generate an API key from the user dashboard. This key is required for all API requests.

The API key is passed in the `Authorization` header of each HTTP request:

```
Authorization: your-api-key
```

No OAuth, scopes, or additional credentials are required. There is a single API key per account.

## Features

### Weather Forecast and Historical Data

Retrieve weather information for a specific latitude and longitude. Available parameters include air temperature, air pressure, humidity, wind speed/direction/gust, precipitation, cloud cover, solar radiance, and UV index.

- Coordinates (latitude and longitude) are required. Specific weather parameters can be requested.
- Users can specify individual data sources (e.g., "metno", "noaa", "sg") or combine multiple ones.
- Supports both forecast data (up to 10 days ahead in hourly resolution) and historical data.
- Start and end times can be specified to define the time range.

### Marine Data

Retrieve marine environment information for a specific latitude and longitude, including parameters such as waveHeight, swellHeight, and waterTemperature.

- Additional marine parameters include wave direction, currents, secondary swell, wind wave, ice cover, sea depth, chlorophyll, salinity, pH, oxygen, and phytoplankton.
- Same coordinate-based querying and source selection as weather data.

### Tide Data

The tide API mainly consists of two capabilities: sea-level data and extremes (high/low tide times).

- **Sea Level**: Returns predicted sea levels at hourly intervals for a given coordinate.
- **Extremes**: Returns tide levels as well as timestamps for high/low tide (extremes) globally.
- The tide API contains thousands of stations located around the world, and automatically selects the station closest to the provided coordinates.
- Start and end date range can be specified. Datum reference can be configured (defaults to Mean Sea Level).

### Tide Station Listing

Retrieve a list of all available tide stations globally, including metadata such as station name and location.

### Astronomy Data

The Astronomy data includes sunrise, sunset, moonrise, moonset, moon phase, closest moon phase, and moon fraction. First and last light for outdoor activities and navigation is also included, with times according to nautical, civil, and astronomical definitions.

- Queried by coordinate and date range.

### Solar Data

The solar request is used to fetch solar-related data for a point. This includes solar radiation and UV index data useful for solar energy forecasting.

- Queried by coordinate, with optional date range, parameters, and source selection.

### Elevation Data

Retrieve elevation data for a specific coordinate point.

- Queried by latitude and longitude.

### Data Source Selection

Stormglass.io collects data from a wide range of oceanographic and meteorological institutions. All data sources are fully transparent — developers can access each provider individually or use Stormglass AI, an intelligent global grid that automatically selects the best-performing source.

- Use the source `"sg"` to leverage Stormglass AI automatic source selection.

## Events

The provider does not support events. Stormglass.io is a data retrieval API and does not offer webhooks or event subscription mechanisms.
