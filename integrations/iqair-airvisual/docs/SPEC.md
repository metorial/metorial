# Slates Specification for Iqair Airvisual

## Overview

IQAir AirVisual is a Swiss air quality data platform that provides real-time, forecast, and historical air quality and weather data. The platform collects data from more than 30,000 ground-based air quality monitoring sensors worldwide, spanning more than 5,000 cities across 100+ countries. It reports on PM2.5, PM10, NO2, CO, SO2, and ozone, along with weather parameters.

## Authentication

The API uses **API key** authentication. The only thing you need to start using the service is an API key, which can be obtained for free at `https://www.iqair.com/dashboard/api`.

To create an API key, sign in to your IQAir account (or register one). Click on the "Dashboard" button on the top-right corner of the IQAir website, or access it at `https://dashboard.iqair.com/`. Once signed in, click the "Air quality API" tab in the left menu bar.

The API key is passed as a query parameter named `key` on every request. For example:

```
https://api.airvisual.com/v2/nearest_city?key=YOUR_API_KEY
```

There are three subscription plans — Community (free), Startup (subscription), and Enterprise (subscription) — with different features and levels of data. The Community API key is valid for 12 months, after which it will expire and must be regenerated.

## Features

### Real-Time Air Quality by City

Retrieve current air quality index (AQI) and weather conditions for a specific city. Returned data includes city name, GPS coordinates, AQI index, pollutant concentrations (PM2.5, PM10, SO2, CO, O3, NO2), humidity, pressure, wind speed and direction. Cities are queried by specifying a country, state, and city name.

### Nearest City Air Quality

Get air quality data for the nearest city to your location. Data can be collected via latitude/longitude or by IP-based geolocation. This is useful when the exact city name is unknown.

### Station-Level Air Quality

Fetch air quality and weather data for a specific monitoring station by ID, or find the nearest monitoring station to given GPS coordinates. Station-level data provides more granular readings than city-level data.

- Available on Startup and Enterprise plans only.

### Air Quality Forecasts

Retrieve hourly and daily AQI forecasts for any supported city. This includes 72-hour hourly predictions and 7-day daily outlooks.

- The 7-day AQI and weather forecast is available on the Enterprise plan.

### Historical Air Quality Data

Pull historical air quality readings for any city within a specified date range.

- Enterprise plan provides 48-hour historical data for AQI, pollutant concentrations, temperature, and humidity.

### Location Directory

Browse supported locations hierarchically. You can list countries, states within a country, and cities within a state. This is useful to discover available locations before querying air quality data.

### City AQI Rankings

Retrieve a ranking of cities worldwide based on current AQI. This enables comparison of air quality across multiple cities globally.

### Device/Node Data (AirVisual Pro)

The AirVisual Pro air quality monitor comes with an inbuilt device API. You can use this to access your device's measurements. Data includes indoor PM2.5, PM10, CO2, temperature, and humidity readings in addition to nearby outdoor station data.

- Requires an AirVisual Pro hardware device and its device-specific API link or Node ID.

## Events

The provider does not support events. IQAir AirVisual is a read-only data API with no webhook or event subscription mechanism.
