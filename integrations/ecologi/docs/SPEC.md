Let me fetch the actual API docs for more details on endpoints and authentication.The Stoplight pages require JavaScript. Let me try fetching the API spec directly from GitHub.Now let me fetch the Microsoft Learn page for the connector which often has good structured details:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Ecologi

## Overview

Ecologi is a climate action platform that enables individuals and businesses to fund tree planting and carbon avoidance projects worldwide. Its API allows programmatic purchasing of trees and carbon offsets, as well as retrieval of impact statistics for any user profile.

## Authentication

Ecologi uses two different authentication approaches depending on the API being used:

**Purchasing Impact API (API Key)**

- Ecologi uses API keys for authentication.
- An Ecologi account is required — this is where any impact your API triggers will be displayed. An API key can be generated from your Ecologi account settings once you've created your account.
- The API key must be passed as a Bearer token in the `Authorization` header: `Authorization: Bearer <your-api-key>`.

**Reporting API (No Authentication)**

- The Reporting API provides direct access to your impact totals, and requests to it do not require authorisation.
- There are 3 available reporting endpoints using the pattern: `https://public.ecologi.com/users/{username}/trees`, `https://public.ecologi.com/users/{username}/carbon-offset`, and `https://public.ecologi.com/users/{username}/impact`. Only an Ecologi username is needed to query these.

## Features

### Purchase Trees

Purchase 1 or more trees per request. Each purchase is tied to your Ecologi account and displayed in your public forest.

- **Parameters**: Number of trees (required), a "funded by" name to label the trees (optional), and a test mode flag (optional) to simulate transactions without actual charges.
- The response includes the cost, currency, a unique tree URL for the planted trees, and the name provided.
- It is not possible to choose a specific country or project — API trees are randomly assigned from Ecologi's global reforestation project mix.
- Any impact created during the month will show as "Pending" until payment for that month has been processed.

### Purchase Carbon Avoidance Credits

Purchase 1 or more kilograms of carbon avoidance credits per request.

- **Parameters**: Number of units (required), unit type (required, e.g., KG or Tonnes), and a test mode flag (optional).
- The response includes the number of units purchased, the equivalent in tonnes, the total cost, and the currency.

### Retrieve Impact Statistics

Retrieve a combination of all impact types a user has funded: trees, carbon avoidance, carbon removal, and habitat restoration, in a single request.

- Can also retrieve individual metrics: total number of trees planted, or total tonnes of CO₂e avoided.
- Only requires the Ecologi username — no API key needed.
- Data refreshes every 10 minutes.

## Events

The provider does not support events. Ecologi's public API does not offer webhooks, event subscriptions, or any built-in push notification mechanism for changes to impact data or purchases.
