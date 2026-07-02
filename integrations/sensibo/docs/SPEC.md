Now let me check the OpenAPI spec for more details on features and webhooks:I now have enough information to write the specification.

# Slates Specification for Sensibo

## Overview

Sensibo is a smart climate control platform that provides IoT devices (Sky, Air, Air Pro, Pure, Elements, Room Sensor, Door/Window Sensor) for remote control and monitoring of air conditioners and air purifiers. The API allows programmatic control of AC states, access to environmental sensor data, scheduling, and automation features. Sensibo also offers Airbend, a commercial/enterprise platform for managing devices across organizations in bulk.

## Authentication

### API Key

The primary authentication method. API keys are passed as a query parameter on every request.

- **Generate keys** at [https://home.sensibo.com/me/api](https://home.sensibo.com/me/api)
- **Usage**: Append `?apiKey={your_api_key}` to every API request
- Keys can be deleted and rotated from the same settings page
- Base URL: `https://home.sensibo.com/api/v2`

### OAuth2

Available for commercial users only. To obtain OAuth2 access, contact `support@sensibo.com` with specific details about your use case. No public documentation is available for scopes or endpoints; these are provided upon approval.

## Features

### Device Management

Retrieve a list of all Sensibo devices associated with your account, or get detailed information about a specific device. Device info includes current AC state, sensor readings, device capabilities, and configuration. A `fields` parameter allows selecting which data fields to retrieve, including `fields=*` for all available fields.

### AC State Control

Set or modify the air conditioner state, including power (on/off), mode (cool, heat, fan, dry, auto), target temperature, fan level, swing mode, horizontal swing mode, light, and temperature unit. You can either set the full AC state at once or change a single property without affecting the others.

- Available modes, fan levels, swing options, and temperature ranges depend on the specific AC model paired with the device.

### Environmental Measurements

Read current temperature and humidity from Sensibo devices, as well as historical measurements for up to 7 days in the past. Sensibo Air Pro and Elements devices also provide air quality data.

### Scheduling & Timers

Create, retrieve, update, and delete schedules and timers for devices. Timers turn the AC on or off after a specified duration. Schedules allow recurring AC state changes based on day-of-week and time-of-day configurations.

### Climate React

Configure and manage Sensibo's Climate React automation feature, which automatically adjusts AC state when temperature or humidity crosses defined thresholds. Climate React can be toggled on/off and can be further controlled by geofence state, schedules, or motion detection.

- Configurable trigger types: temperature, feels-like temperature, or humidity.
- Separate AC states can be defined for above-high-threshold and below-low-threshold conditions.

### Door/Window Sensor Events

Retrieve open/close events from Sensibo Door/Window Sensors, including timestamps and state transitions.

### Airbend (Commercial/Enterprise)

Manage devices, users, and permissions within an Airbend organization. Includes bulk operations for setting AC states across multiple devices simultaneously, retrieving bulk historical measurements, bulk device events, and bulk door sensor events. Admin users can manage organization members and reset devices in bulk.

- Requires Airbend commercial account.
- Some operations (user management, device reset) require admin privileges.

## Events

The provider does not support webhooks or purpose-built push event subscriptions. Device events (such as AC state changes, schedule changes, Climate React triggers, geofence events, motion detection events, door sensor state changes, and location/user geofence events) are available via a polling-based event retrieval endpoint that returns historical events up to a configurable number of days backwards. This is a standard API query, not a webhook or streaming mechanism.

The provider does not support events.
