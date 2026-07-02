# Slates Specification for Ambee

## Overview

Ambee is an environmental and climate data provider that offers REST APIs for accessing hyperlocal environmental datasets. Its offerings cover air quality, weather, pollen, wildfires, natural disasters, and other environmental indicators, with 37 unique climate-centric endpoints providing granular information across various datasets.

## Authentication

Ambee uses API key authentication. To begin using Ambee's APIs, you'll need an active Ambee account to generate your custom API keys, which grant access to the available datasets.

**Obtaining an API Key:**

1. Go to the API Dashboard to sign up using your Google or business account credentials.
2. After signing up, your API key will be displayed on the dashboard. Copy this key and start using it in your API requests.

**Using the API Key:**

- Include the API key as a part of the request headers. Requests without an API key or with an invalid API key will receive an HTTP 401 - Invalid Authentication Key.
- The API key is passed via the `x-api-key` header. Example: `headers: { "x-api-key": "YOUR_API_KEY" }`
- The API key is a unique alphanumeric string linking your Ambee account to the specific API. Users subscribed to the enterprise plan are able to generate multiple API keys.
- You can reset the API key every 30 days in the API dashboard using your registered email address.

## Features

### Air Quality Data

Provides real-time air quality data compliant with US EPA standards, with worldwide data coverage. Also offers historical air quality data spanning over 30 years. Data can be queried by latitude/longitude, postal code, city name, or country code. Includes AQI values and individual pollutant concentrations. Also provides air quality forecasts and identifies most/least polluted places by country.

### Weather Data

Includes real-time weather data, forecast data, and historical weather data, providing information on temperature, pressure, humidity, wind, cloud coverage, visibility, and dew point. Data can be queried by geographic coordinates. An optional `units` parameter allows switching to SI units.

### Pollen Data

Provides real-time pollen count data for tree, grass, and weed pollen by latitude/longitude or by place name. Also provides historical pollen count data and forecast pollen count data by geographic coordinates.

### Wildfire Data

Allows tracking of real-time wildfire activity globally with hourly updates, and access to 4-week predictive fire-risk forecasts (weekly intervals) for North America (US & Canada). Delivers critical information on fire location, intensity, size, and essential air quality data. Includes parameters like Fire Weather Index (FWI), fire radiative power, rate of spread, Fire Risk Index, and burned area polygon coordinates. Historical wildfire data is also available.

### Natural Disaster Data

Provides real-time and historical data on earthquakes (including tsunamis), floods, droughts, volcanic eruptions, cyclones, and wildfires. Data can be queried by latitude/longitude, continent code, or country code, and filtered by event type. Offers insights into episode-wise severity, risk levels, and more.

### Soil Data

Provides real-time soil moisture and soil temperature levels for any location by latitude and longitude. Historical soil data is also available.

### Water Vapor Data

Provides real-time water vapor levels for any location by latitude and longitude. Historical water vapor data is also available.

### NDVI / EVI Data

Ambee's NDVI API gives access to near-real-time, high-resolution, and historical NDVI data. The data helps understand, monitor, and analyze the health of land cover. The dataset includes NDVI, EVI, and UVI values for a given location. Useful for agriculture management, reforestation, and urban planning.

### Elevation Data

Provides altitude and elevation data for any location. Useful for navigation, disaster prediction, and infrastructure optimization.

### Map Tiles

Provides visual map tile layers for air quality (AQI) and pollen data (tree, grass, weed) that can be rendered in mapping applications.

### Multi-language Support

API responses support multiple languages. By default, responses are provided in English, but you can specify a different language by using the `Accept-Language` header.

### Location Query Options

Most datasets support querying by multiple location methods: latitude/longitude coordinates, postal code (with country code), city name, or country code. This applies across air quality, weather, pollen, and other data types.

## Events

Ambee supports webhooks for push-based environmental alerts through its Webhooks platform.

### Environmental Condition Alerts

Ambee Webhooks is a push-based data delivery platform that provides instant, customizable alerts for environmental datasets, specifically pollen, air quality, and weather. Alerts can also be scheduled for wildfires and other datasets.

- **Configuration:** Users can configure alert name, data type, locations, and conditions to trigger the alerts. For example, a condition like "Temp > 30°C" can be set.
- **Frequency:** Users select the frequency and time period (start date and end date) for receiving alerts. The lowest frequency for alerts is hourly.
- Ambee Webhooks is an invite-only platform. Access must be requested through Ambee's support team.

### Cloud Data Dumps

In addition to alerts, Ambee Webhooks also allows cloud-based data dumps for datasets. Supported destinations include FTP servers, Google Cloud Platform, Amazon S3 bucket, and Microsoft Azure.

- Data dumps are currently available only with privileged access. To set this up, contact customer support.
