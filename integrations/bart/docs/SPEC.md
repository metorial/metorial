# Slates Specification for Bart

## Overview

BART (Bay Area Rapid Transit) is the public rapid transit system serving the San Francisco Bay Area. Its API provides read-only access to real-time train departure estimates, schedules, station information, fare data, and service advisories. The API supports both XML and JSON output formats.

## Authentication

BART offers a public API key that requires no registration. However, if you sign up for your own personal key, you'll retain access even if the public key is refreshed.

- **Method**: API Key (passed as a query parameter)
- **Parameter**: `key` — included in every API request URL as a query string parameter
- **Registration**: You can sign up for free at `https://api.bart.gov/api/register.aspx`.
- **Usage**: Append `key=YOUR_API_KEY` to every request. For example:  
  `https://api.bart.gov/api/etd.aspx?cmd=etd&orig=RICH&key=YOUR_API_KEY`
- To receive JSON instead of XML, add `&json=y` to the request.

No OAuth or other authentication mechanisms are used. There are no scopes or tokens involved.

## Features

### Real-Time Departure Estimates

Provides estimated time of departure (ETD) data for trains at any station. Since dwell times are typically under one minute, ETDs are effectively equivalent to estimated arrival times. You can filter by origin station, direction, or platform. Results include destination, train length, color/line, delay information, bike flag, and cancellation status.

### Trip Planning

Plan a trip between two BART stations by specifying either a desired arrival or departure time. Trip results include CO2 savings data for each trip. Fare information (cash and Clipper card pricing) is included in trip results. You can specify the date and number of trip options to return.

### Fare Information

Retrieve fare costs between any two BART stations. Fares represent the cost of a trip between two stations, calculated using the same back-end processes as the BART website. Trips starting and ending at the same station return the excursion fare. Fare information includes fare class and various fare types (cash, Clipper).

### Station Information

Retrieve a list of all BART stations, detailed information about a specific station, and station access/neighborhood information (parking, bike racks, lockers, entering/exiting directions, and nearby transit connections). Stations are identified by standard abbreviation codes.

### Route Information

Retrieve information about BART routes including the list of stations on each route, route color, direction, and the full schedule for a specific route.

### Service Advisories

BART Service Advisories (BSA) are messages from the BART Operations Control Center about conditions that could affect the system, including delays, police actions, and equipment problems. Advisories are issued when two or more trains are off schedule by more than 10 minutes.

### Elevator Status

Retrieve current elevator outage information across the BART system.

### Train Count

Request the number of trains currently active in the BART system.

### Schedule Information

Retrieve available schedule versions, holiday schedules (with the type of schedule run on each holiday), special schedule notices, full route schedules, and complete daily station schedules.

## Events

The provider does not support events. The BART API is a read-only, request-response API with no webhook or event subscription mechanism.
