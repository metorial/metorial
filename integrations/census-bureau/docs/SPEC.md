# Census Bureau Integration Specification

## Overview

The U.S. Census Bureau provides a free, public REST API that gives access to raw statistical data from various Census Bureau programs, including demographic, economic, housing, and geographic datasets. Applications built on Census data typically take advantage of three underlying services: the Census Data API, TIGERweb REST Services, and the Geocoder REST Services.

## Authentication

The Census Data API uses **API Key** authentication. Since May 12, 2026, an API key is required for all statistical data queries. Dataset discovery and metadata, the Census Geocoder, and TIGERweb remain usable without an API key through the no-auth connection option.

To obtain an API key:

1. Visit the key signup page at `https://api.census.gov/data/key_signup.html`.
2. Enter your Organization Name and the email address you want associated with the API key, agree to the terms of service, then submit the request.
3. Check your email for a confirmation email and click the activation link.

The key is passed as a query parameter appended to API calls: `&key=your key here` at the end of the request URL.

No OAuth, tokens, or other authentication mechanisms are used. The key is a simple alphanumeric string.

## Features

### Statistical Data Queries

The Census Data API gives the public access to raw statistical data from various Census Bureau data programs. Users can query specific variables (e.g., population, income, housing characteristics) from datasets, filtered by geographic area (using FIPS codes) and vintage year.

- **Datasets**: Available datasets include the Decennial Census, American Community Survey, Small Area Health Insurance Estimates, Small Area Income and Poverty Estimates, Population Estimates and Projections, and more. Additional datasets cover economic indicators, international trade, business dynamics, community resilience, and health insurance.
- **Dataset types**: There are three types of datasets: aggregate, microdata, and timeseries. Aggregate datasets represent a single vintage year; timeseries datasets allow querying data across multiple time periods in a single call.
- **Variables**: Each dataset exposes named variables (e.g., POP, STNAME). You can include up to 50 variables in a single API query. Variable groups allow fetching all variables in a table at once.
- **Geography filtering**: Data is aggregated and associated with Census geographic boundaries defined by FIPS codes. Supported geographies include nation, state, county, tract, block group, congressional district, metro area, and more, varying by dataset.
- **Predicates**: Queries can be filtered using predicates on variable values, including exact matches, ranges (for numeric variables), and wildcards (for string variables and geographies).
- **Results**: Query Census Data returns string rows and original `rawRows` that preserve unavailable values as `null`. Empty strings in the string rows represent unavailable values. Discovery and variable lookup support `offset` and return `nextOffset` when more matching results exist.

### Dataset Discovery

A Discovery Tool at `https://api.census.gov/data.html` lists all available datasets, their variables, supported geographies, and metadata. Each dataset and series of datasets has its own API, which are further subdivided by year of release.

### Geocoding

The Geocoding Services engine converts a structured or single-line address to coordinates and optional Census geographies. Structured addresses require a street and ZIP code, or a street, city, and state. Coordinate searches return containing geographies and do not return a street address. Get Geocoder Options discovers address benchmarks and compatible geography vintages; select a returned vintage when using a historical benchmark. The current defaults are `Public_AR_Current` and `Current_Current`.

### Geographic Boundary Data (TIGERweb)

TIGERweb GeoServices REST API provides Census area boundaries/shapes referenced by FIPS codes, and can take a FIPS code or a latitude/longitude pair to return one or more Census boundaries. This follows the GeoServices REST specification for GIS server communication.

Get Boundary Layers lists layer IDs and names for a map service and can inspect attribute fields, geometry type, record limits, and pagination support. Layer IDs differ by service and vintage. Query Geographic Boundaries accepts `resultOffset`, returns `exceededTransferLimit`, and exposes the spatial reference of returned geometries. Only layers advertising pagination support accept paginated queries.

## Official documentation

- [Census Data API query limits and API key policy](https://www.census.gov/data/developers/guidance/api-user-guide.Query_Limits.html)
- [Census Data API core concepts](https://www.census.gov/data/developers/guidance/api-user-guide.Core_Concepts.html)
- [Dataset discovery directory](https://api.census.gov/data.html)
- [Census Geocoder API](https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html)
- [Current TIGERweb service directory](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer)
- [GeoServices layer query parameters](https://developers.arcgis.com/rest/services-reference/enterprise/query-map-service-layer/)

### Microdata Access

The U.S. Census Bureau's microdata is now available as a Census Bureau API. Microdata contains the individual-level responses for a survey for use in custom analysis, where one row represents one person. This is available for select surveys like the American Community Survey and Current Population Survey.

### International Demographic Data

The International Database (IDB) offers a variety of demographic indicators for countries and areas of the world with a population of 5,000 or more.

### Economic Indicators (Time Series)

Fourteen national, monthly and quarterly surveys cover construction, housing, international trade, retail and wholesale trade, services, manufacturing and more. These time series datasets allow querying economic indicators across time periods.

## Events

The provider does not support events. The Census Bureau API is a read-only data retrieval service with no webhooks, event subscriptions, or built-in polling mechanisms.
