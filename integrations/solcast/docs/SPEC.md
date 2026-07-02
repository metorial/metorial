# Slates Specification for Solcast

## Overview

Solcast (a DNV company) provides global solar irradiance, weather, and PV power data via API. The Solcast API provides forecast, live and historical solar irradiance, PV power and weather data. The API provides 20+ weather parameters tailored to solar energy applications, from 2007 to 7 days ago. It serves the renewable energy industry for resource assessment, operational forecasting, and grid management.

## Authentication

The Solcast API allows for several methods of authentication using your provided API key. The API key is a user-specific key accessible from your account page in the Solcast API Toolkit. An API key will be a 32-character text string.

The API key can be provided in three ways:

1. **Query string parameter**: Pass the API key as `api_key` in the URL query string. Example: `GET https://api.solcast.com.au/rooftop_sites/{site_id}/forecasts?api_key=YOUR_APIKEY`

2. **Bearer token**: Pass the key in the `Authorization` header with type `Bearer`. Example header: `Authorization: Bearer YOUR_APIKEY`

3. **Basic authentication**: For use with Basic authentication, the API key is passed only as the username with an empty password.

Registration is free and access is instant. New users are granted a limited number of free any-location requests to each API endpoint, for testing and evaluation. To begin using the API commercially, a paid subscription is required.

**Integration API**: The Solcast Integration API allows your application to make requests to the Solcast API on behalf of registered Solcast users. This requires an `integrator_id` and `integrator_api_key` provided by Solcast, plus a `user_api_key` for each user.

## Features

### Radiation and Weather Data (Live, Forecast, Historical)

Retrieve solar irradiance and weather data for any global location. Solcast's solar forecast data projects irradiance and PV power from five minutes ahead to 14 days out, with 5- to 60-minute granularity anywhere on the planet. Available parameters include GHI, DNI, DHI, GTI, air temperature, wind speed and direction, relative humidity, surface pressure, precipitation rate, snow depth, PM2.5, PM10, cloud opacity, and more.

- Data is available in three temporal modes: **live** (estimated actuals), **forecast** (up to 14 days ahead), and **historical** (time series from 2007 to 7 days ago).
- Key parameters: `latitude`, `longitude`, `output_parameters` (select specific data fields), `period` (time resolution: 5, 10, 15, 30, or 60 minutes), timezone configuration (UTC, longitudinal, or fixed offset).
- Solcast provides probabilistic forecasting, including P10, P50 and P90, for day-ahead forecasts.
- Terrain shading can be applied via a `terrain_shading` parameter.
- Output formats: JSON and CSV.

### Rooftop PV Power

The Solcast Rooftop PV Model produces rooftop PV power output estimates, designed for modelling the production from rooftop PV systems (particularly fleets) with limited system specifications available.

- Requires location (latitude/longitude), system capacity, tilt, and azimuth as inputs.
- Available in live, forecast, and historical modes.
- Supports submitting real power measurements to tune and improve site-specific forecasts.
- Free hobbyist tier available for personal home PV systems (up to 2 tilt/azimuth combinations at one location).

### Advanced PV Power

The SDK provides 'Rooftop' and 'Advanced' PV power estimates. The advanced estimates use a more sophisticated PV model with comprehensive and flexible site configuration options.

- Requires creating a **PV Power Site** with detailed specifications (capacity AC/DC, tracking type, module type, ground coverage ratio, derating factors, inverter efficiency, bifacial settings, dust soiling, etc.).
- Sites can be listed, retrieved by ID, created, partially updated, fully replaced, and deleted.
- Supports operational adjustments such as snow soiling override, dust soiling, constraints/curtailment, reduced availability, and inactive trackers.
- Available in live, forecast, and historical modes.

### Typical Meteorological Year (TMY)

Retrieve synthetic TMY datasets for long-term resource assessment and energy yield modeling. TMY data is available for radiation and weather, as well as for advanced PV power.

- TMY data is generated from 15+ years of satellite-derived historical data.
- Available in multiple formats including PVsyst and SAM-compatible file formats.
- Probabilistic TMY data is available.

### Grid Aggregations

Thousands of PV systems, combined according to your operating regions or grid assets. Retrieve live grid aggregation data for up to 7 days, and forecast grid aggregation data for up to 7 days.

- Aggregations are custom-built by the Solcast team based on provided PV fleet metadata.
- Estimates delivered in total power (MW) or performance units (such as % of total capacity), updated every 10 or 15 minutes.
- Supports probabilistic outputs (P10/P50/P90).
- Primarily used for grid management, load forecasting, VPP management, and energy trading.
- Aggregation setup requires contacting Solcast directly; not self-service.

## Events

The provider does not support events. Solcast is a data retrieval API — it does not offer webhooks, event subscriptions, or any purpose-built push/polling notification mechanism.
