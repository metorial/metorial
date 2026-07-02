# Slates Specification for Ambient Weather

## Overview

Ambient Weather is a personal weather station company that provides the AmbientWeather.net cloud platform for collecting and accessing weather data. The API allows programmatic access to weather stations at AmbientWeather.net, enabling retrieval of real-time and historical weather station data in JSON format, including support for multiple devices.

## Authentication

Ambient Weather uses API key-based authentication. Two API keys are required for all REST API requests: an **Application Key** (`applicationKey`) that identifies the developer/application, and an **API Key** (`apiKey`) that grants access to past/present data for a given user's devices.

Both keys are passed as query parameters on every request.

- **Application Key**: Created by the developer by logging into their AmbientWeather.net account page at https://ambientweather.net/account. One Application Key is needed per application.
- **API Key**: A typical consumer-facing application will ask the user to create an API Key on their AmbientWeather.net account page and paste it into the app. Developers building personal or in-house apps will also need to create an API Key on their own account page.

**REST API base URL**: `https://rt.ambientweather.net/v1/`

**Realtime API (Socket.io) endpoint**: `https://rt2.ambientweather.net/?api=1&applicationKey=....` — note the realtime subdomain (`rt2`) is different from the REST subdomain (`rt`).

## Features

### Device Listing

Retrieve a list of the user's available devices along with each device's most recent data. Each device is identified by its MAC address.

### Historical Device Data

Fetch historical data for a given device. Data is stored in 5 or 30 minute increments.

- **endDate** (optional): The most recent datetime to query from; results descend from there. If left blank, the most recent results are returned.
- **limit** (optional): The maximum number of results to return (max: 288).
- Data includes a wide range of sensor readings (temperature, humidity, wind speed, barometric pressure, rain, UV, solar radiation, etc.) depending on the specific weather station model. Not all devices send all parameters.

### Real-Time Data Streaming

The Realtime API allows receiving weather station data in real time via WebSockets (Socket.io). The Application Key is passed on initial connection, and the API Key is used to subscribe to a user's devices, granting read-only access to all devices for that user.

- Subscribe to one or more API keys to receive data for all associated devices.
- Unsubscribe to stop receiving data.

## Events

Ambient Weather supports real-time event streaming via its **Realtime API** using WebSockets (Socket.io). This is not a traditional webhook system, but a persistent socket connection that pushes events.

### Subscribed

`subscribed` events are emitted after a `subscribe` or `unsubscribe` command. They list all devices currently subscribed to and, if applicable, return any invalid API keys.

### Data

`data` events are emitted when a device you are subscribed to sends new data. The payload contains the latest sensor readings from the device, matching the same fields available through the REST API.
