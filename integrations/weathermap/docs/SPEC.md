# Slates Specification for OpenWeatherMap

## Overview

OpenWeatherMap (OpenWeather) is a weather data provider that offers current conditions, forecasts, historical weather archives, air quality data, geocoding, weather maps, solar irradiance, and specialized datasets for any location on the globe. It provides reliable, global weather data through structured, industry-standard REST APIs, supporting applications from lightweight integrations to large-scale data systems.

## Authentication

OpenWeatherMap uses **API key** authentication exclusively.

- To get started, sign up for an account, fill out the registration form, and receive an API key (called `appid`). You must verify your email address via a confirmation email.
- The API key is sent in the welcome email upon sign-up. Additional API keys can be generated from the account page under "API Keys."
- The API key must be included in every API call. The platform only processes requests that include a valid API key.
- The API key is passed as a query parameter named `appid`. For example: `https://api.openweathermap.org/data/2.5/weather?lat=51.508&lon=-0.126&appid={API_KEY}`
- The base endpoint for free API calls is `api.openweathermap.org`. The endpoint for paid subscription plans is different and provided in the subscription confirmation email.
- Newly created API keys typically take between 10 minutes and 2 hours to activate.

## Features

### Current Weather Data

Retrieve real-time weather conditions for any location globally. Provides comprehensive weather details including temperature, pressure, humidity, wind speed, cloud coverage, and visibility. Locations can be specified by geographic coordinates (latitude/longitude). Response format supports JSON, XML, or HTML. Units can be set to standard (Kelvin), metric (Celsius), or imperial (Fahrenheit).

### Weather Forecasts

Access short-term and extended weather forecasts. Available forecast types include:

- Minute-by-minute forecast for 1 hour, hourly forecast for 48 hours, daily forecast for 8 days, and forecasts up to 1.5 years ahead (via One Call API 3.0).
- 5-day/3-hour forecast available on free plans.
- Configurable parameters include units, language, and the ability to exclude specific data sections (minutely, hourly, daily, alerts).

### Historical Weather Data

Access 47+ years of hourly archive data, forecast history, and statistical datasets starting from January 1, 1979. Historical data can be queried for specific timestamps or as daily aggregations. Data is available via APIs and as one-time bulk exports.

### One Call API (v3.0)

A comprehensive weather endpoint combining current conditions, forecast, historical data, and alerts within a single API call for a specific location. Also includes:

- A weather overview with a human-readable weather summary utilizing AI technologies.
- An AI Weather Assistant for retrieving weather data and advice in a conversational format.
- Requires a separate "One Call by Call" subscription, which includes 1,000 free calls/day.

### Air Pollution Data

Provides current, forecast, and historical air pollution data for any coordinates on the globe, including Air Quality Index and data about polluting gases such as CO, NO, NO2, O3, SO2, NH3, PM2.5, and PM10. Air pollution forecast is available for 4 days with hourly granularity. Historical data is accessible from November 27, 2020.

### Geocoding

Supports both direct and reverse geocoding methods, working at the level of city names, areas and districts, countries and states. Direct geocoding converts location names to geographic coordinates; reverse geocoding converts coordinates to location names. You can limit the number of returned results for ambiguous queries.

### Weather Maps

Visual weather map layers for representation of weather conditions. Includes Weather Maps 2.0 API providing forecasts, current, and historical data for 15 different weather layers (temperature, wind, precipitation, clouds, pressure, etc.). Maps are served as tile layers suitable for integration with mapping libraries.

### Solar Irradiance & Energy Prediction

Provides solar data by location for energy generation calculations, including GHI, DNI, DHI indices for clear sky and cloudy sky models. Includes current data and forecast for 15 days ahead, plus 47+ years of historical data. Allows creating solar panels for specific locations with desired specifications to estimate power output.

### Road Risk Data

Provides real-time and forecasted road weather risk data for any location. Includes risk indicators based on weather parameters such as temperature, precipitation, wind, visibility, and national alerts.

### Weather Alerts (OpenWeather Alerts API)

Alerts notify users of specified weather conditions or phenomena in or intersecting with a defined area. Alerts are generated based on OpenWeather data or national weather agency data, covering conditions like hail, tornado, extreme temperatures, and air quality. Users can filter alerts by area of interest (point or polygon) and by weather parameters or specific phenomena.

### Fire Danger Assessment

Provides advanced fire danger assessment data to support wildfire prevention, monitoring, and risk management.

### Agricultural Monitoring (Agro)

A satellite-based crop and field monitoring platform delivering agricultural intelligence data worldwide.

### Bulk Data Downloads

Pre-collected weather data grouped by type and location lists (global city lists or ZIP code lists for EU, UK, and US). Available for premium subscriptions.

## Events

### Global Weather Alerts (Push Notifications)

OpenWeather's Global Weather Alerts service delivers push notifications about severe weather, collecting warnings from national weather warning systems worldwide. Users provide an endpoint URL, and all weather alerts are sent to that endpoint via POST requests.

- Each push notification contains fields such as headline, start/end dates, description, urgency, severity, certainty, and sender agency.
- Alerts cover the entire world. As soon as a new weather alert is received from national agencies, it is processed and sent to users via push notifications.
- If an alert is scheduled to start more than 15 minutes in the future, it is stored and resent 15 minutes before onset. Updated alerts are treated as separate notifications.
- Alert dissemination may experience delays of up to 30 minutes.
- This is a paid product requiring direct coordination with OpenWeather to set up access and configure the endpoint.
