# Slates Specification for Ticketmaster

## Overview

Ticketmaster is a global live event ticketing platform that provides APIs for event discovery, ticket commerce, inventory management, and venue entry validation. The API provides access to content sourced from various platforms, including Ticketmaster, Universe, FrontGate Tickets and Ticketmaster Resale (TMR). Coverage spans different countries, including United States, Canada, Mexico, Australia, New Zealand, and the United Kingdom.

## Authentication

Ticketmaster uses **API Key** authentication for its public and partner APIs.

**Obtaining an API Key:**

1. Register for a developer account at `https://developer.ticketmaster.com/`.
2. After registration, a default application will be created. The application contains a Consumer Key that is used for authentication. Your Consumer Key is your API Key.

**Using the API Key:**

For the **Discovery API**, **Commerce API**, **Inventory Status API**, and **Presence API**: Pass your API Key in the `apikey` query parameter.

Example: `https://app.ticketmaster.com/discovery/v2/events.json?apikey={apikey}`

For the **Partner API**: Clients will be provided an API key from Ticketmaster which should be added to every resource endpoint call. The key can be sent as a query parameter `apikey` or as a header `x-api-key`.

**Access tiers:**

- Ticketmaster offers event discovery and commerce APIs with various access tiers. Upon registration and obtaining your API key, you will be able to access the Discovery and Commerce APIs instantly.
- The Partner API, unlike the Discovery API, is not an open API. It is restricted to companies with whom Ticketmaster has existing, official distribution relationships.
- The Inventory Status API provides event status for primary Ticketmaster inventory. Access is provided to authorized clients only. Please request access by contacting devportalinquiry@ticketmaster.com.
- The Presence API requires authorization using an API Key. Contact your Ticketmaster Nexus Partner Program coordinator to receive an API Key.

**3rd Party Integration API** (EU markets) uses **OAuth 2.0** with client credentials: The OAuth2.0 standard is used, based on the use of temporary access codes called tokens. To obtain an access token it will be necessary for the client to connect to an authentication server through their credentials. The access token is added to the header of the API request with the word "Bearer" followed by the token string.

## Features

### Event Discovery

The Discovery API allows you to search for events, attractions, or venues. Search and filter events by keyword, location (country, city, zip code, DMA, latitude/longitude), date range, classification (segment, genre, sub-genre), attraction, venue, and source platform. Retrieve detailed event information including dates, price ranges, sales periods, promoters, images, and direct purchase URLs.

- The Discovery API has four main entities: event, attraction, classification, and venue. An event is basically a happening at a particular date and time. An attraction is the artist, team or the performers at the event. A classification has three different levels: Segment (music, sports, arts & theater, family).
- Also supports attraction search/details, venue search/details, and classification browsing.
- Includes a suggest/autocomplete feature for type-ahead search.

### Ticket Commerce and Offers

The Commerce API allows retrieving ticket offers and pricing information for specific events. It provides details on available ticket types, price levels, face values, fees, and purchase limits for a given event.

### Ticket Purchasing (Partner API)

The Partner API lets clients reserve, purchase, and retrieve ticket and event information. This includes:

- Checking event availability with detailed seat inventory, pricing, and offer information.
- Reserving specific or best-available tickets, including support for section/row/seat selection.
- Adding payment (integrates with Braintree for payment tokenization), shipping information, and completing cart checkout.
- Managing orders, including retrieving order details, fulfillment (barcodes/eTickets), and processing refunds.
- This API is not open and is restricted to companies with whom Ticketmaster has existing, official distribution relationships.

### Seat Recommendations (Top Picks API)

The Top Picks API provides seat recommendations based on current availability, sampling across various areas of a venue and available price points. Results are near real-time but for certain high velocity events picks may expire (sell out) quickly. Returns seat quality scores, section/row/seat details, snapshot images, and associated offers.

### Inventory Status

The Inventory Status API provides event status for primary Ticketmaster inventory with inventory updates happening near real-time. Returns availability status (tickets available, not available, limited) for both primary and resale inventory, along with price ranges.

- Supports querying multiple events in a single request.
- The Price Ranges feature is currently only supported in these markets: US, CA, AU, NZ, MX.

### Ticket Validation (Presence API)

The Presence API allows you to validate tickets and manage scanning devices for Ticketmaster events. Features include:

- Configuring scanning devices for venues.
- Submitting entry and exit scans for ticket validation.
- Handling offline scanning with later upload of scan data.

### Season Ticketing

The Archtics API provides access to a broad array of information in an Archtics database. This is a collection of API calls used by external systems to access season ticketing data. Supports:

- Discovering available inventory and pricing, holding, reserving and purchasing tickets. The system supports best-available or specific seats. Integrators can use either the client's or an external credit card authorization system. These API calls support new and incremental sales, seat upgrades or exchanges, ticket repricing, and return of previously-purchased seats.
- Access to the rich set of APIs and production data is available by joining Ticketmaster's 'Nexus' partner program.

### 3rd Party Inventory Integration

Through the 3rd Party Integration API, Partners can provide allocations to the Ticketmaster ticketing platform in order to sell their inventory through Ticketmaster sales channels. This includes:

- Ingestion services to import events and venue configurations, availability services to synchronize availability, and runtime services to manage inventory booking, release, order confirmation, cancellation, and status.
- Available in EU markets only.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms. Ticketmaster's APIs are request/response based, and there is no documented webhook system or push-based event notification mechanism available to API consumers.
