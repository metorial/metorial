Let me get more details on the API specification and authentication.Let me fetch the API docs page to understand the full feature set.Now I have enough information to write the specification.

# Slates Specification for Corrently

## Overview

Corrently is a green energy platform maintained by STROMDAO GmbH that provides APIs for renewable energy data, CO2 emissions tracking, electricity pricing, and energy schedule optimization, primarily focused on Germany. The Corrently ecosystem supports green energy services for prosumers, grid operators, regulators, integrators, or any other party with an emerging need of consensus-driven management. Corrently delivers real-time and forecasted renewable energy, CO2, and electricity pricing data via API.

## Authentication

Corrently uses token-based authentication. Corrently uses API keys for authentication.

Tokens can be obtained from the [Corrently Developer Console](https://console.corrently.io/). Two tiers are available:

- **Anonymous Access Token**: No personal information required; issued directly in the browser but has a short expiration time.
- **Email-Secured Access Token**: Requires email verification; provides longer-lived tokens with real-time monitoring and device-independent access.

Once you have a token, it can be used in one of two ways:

- As a URL query parameter: `&token=yourToken`
- As a Bearer token in the `Authorization` header: `Authorization: Bearer yourToken`

The base URL for API requests is `https://api.corrently.io/v2.0/`.

Some public data endpoints (e.g., GrünstromIndex, CO2 data) may be accessible without authentication, but authenticated access is needed for account-specific features like Stromkonto (energy account) balances.

## Features

### Green Power Index (GrünstromIndex)

The GrünstromIndex is a measure used to indicate the availability of renewable energy in the electricity grid at any given time, calculated based on real-time data about the share of renewable energy sources such as wind and solar power in the overall energy mix. Users can query forecasts by postal code (ZIP) to get hourly data including renewable energy percentages, CO2 emissions per kWh, and dynamic energy pricing. Data includes digital signatures for verifying authenticity.

- **Parameters**: Postal code (ZIP) for location-specific data.
- **Considerations**: Focused on German locations only.

### CO2 Advisor

Provides a 24-hour forecast of CO2 levels per kWh of electricity for a given German postal code. Includes a traffic-light advisory system (green/yellow/red) recommending when to increase, maintain, or decrease energy load to minimize environmental impact.

- **Parameters**: Postal code (ZIP).

### CO2 Meter

The CO2 Meter API enables precise tracking of CO2 emissions associated with electricity consumption at specific locations, identified by their postal code. Designed for ESG Scope 2 emissions reporting, it provides real-time CO2 readings along with 24-hour forecasts of renewable energy contributions and energy prices.

- **Parameters**: Postal code (ZIP), meter reading.

### Energy Schedule

The Energy Schedule API enables intelligent control of energy-consuming devices by providing optimized operation schedules based on real-time grid conditions, prices, and environmental factors. Supports multiple optimization modes: price (cheapest electricity), solar (align with solar generation), emission (minimize carbon), and comfort (balance efficiency with user needs). Schedules can be created up to 36 hours in advance.

- **Parameters**: Postal code (ZIP), optimization mode (law), number of active hours required.

### Electricity Market Data

Provides real-time and forecasted electricity pricing data for both the general market and localized regions, based on ZIP codes. Returns time-stamped pricing intervals for both market-level (EUR/MWh) and localized electricity prices.

- **Parameters**: Postal code (ZIP).

### PHEV Charge or Fuel

The PHEV Charge Or Fuel API is a decision-making tool designed for Plug-in Hybrid Electric Vehicle (PHEV) drivers in Germany. Compares real-time fuel prices from nearby stations with electricity costs and CO2 emissions to recommend whether charging or fueling is more economical and environmentally friendly.

- **Parameters**: Postal code (ZIP).

### Photovoltaic Generation Forecast

Provides solar energy production forecasts for specific locations, including hourly output estimates and loss calculations (shading, efficiency, degradation). Users can customize inputs based on their solar panel setup.

- **Parameters**: Latitude, longitude, postal code, panel technology, tilt angle, azimuth, wattage.

### Renewable Energy Dispatch

The Renewable Energy Dispatch API provides detailed insights into the flow and composition of renewable energy for a specified city in Germany, identified by its postal code. Returns energy mix breakdowns (solar, wind, biomass, etc.), energy flow origins and destinations between locations, and geospatial coordinates for visualization.

- **Parameters**: Postal code (ZIP).

### Strommix (Electricity Mix)

Provides data on Germany's electricity generation mix across renewable and non-renewable sources. Users can select predefined time periods (last month, last 7 days) or custom date ranges to analyze production trends and source contributions.

- **Parameters**: Time period or custom date range.

### Merit Order List

Provides the actual merit order list for the German electricity market, showing the order of power plants by marginal cost of production.

### Stromkonto (Energy Account)

Allows access to Corrently energy account balances and billing data, including GrünstromBonus (green power bonus) tracking and CORI token management for micro-investments in renewable energy generation facilities.

- **Parameters**: Account identifier.
- **Considerations**: Requires authenticated access with a valid token.

## Events

The provider does not support events. Corrently is a data retrieval and forecasting API without webhook or event subscription capabilities. Users must poll the API to check for updated forecasts and data.
