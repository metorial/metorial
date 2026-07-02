# Slates Specification for Enigma

## Overview

Enigma Technologies is a data intelligence company that provides comprehensive data on U.S. businesses, including identity, activity, and relationship information. Enigma combines hundreds of public and private sources of data, including government agencies, organizations, and websites, into a single database. Its platform powers use cases such as business verification (KYB), compliance screening, credit risk assessment, sales and marketing enrichment, and payment volume insights.

## Authentication

Enigma uses API key authentication for all API requests.

- The API server authenticates all requests. Each API request must include an `x-api-key` header with your API key. Each authentication token is associated with a specific user, so do not share API keys.
- Technical users can find an API key in the console.
- API keys are obtained by creating an account on the [Enigma Console](https://console.enigma.com).

**Example request:**

```
curl -i 'https://api.enigma.com/graphql' \
  -H 'content-type: application/json' \
  -H 'x-api-key: YOUR_API_KEY' \
  -d '{"query":"..."}'
```

There is no OAuth flow, token refresh, or scope-based access. The API key determines what data and features are available based on your account's subscription and plan.

## Features

### Business Search and Matching

The Match capability enables a user to identify which of Enigma's business profiles corresponds to a business of interest. A user submits identifying information about a business and is returned a potential list of matching profiles with confidence levels. The result is identifying an Enigma ID that can be used to retrieve further data.

- Search by business name, address, website, or person information.
- Enigma has a profile for nearly every business in the U.S. Each profile contains various attributes about that business's identity and health. Enigma also has a profile for each location associated with the business. These profiles are called business locations. You can specify if you want information about the business as a whole or a specific location.
- Entity types include brands and operating locations.
- Enigma IDs are not persistent over time. While the IDs for many businesses and business locations do not change often, their stability cannot be guaranteed.

### Business Data Enrichment

The ID lookup capability enables a user to retrieve specific attributes for a given business profile. Available attributes include:

- Business identity: legal names, operating/DBA names, addresses, websites, industry classification.
- Financial health: payment card revenue data, growth signals.
- Enigma's Identity Graph connects every brand, DBA, location, and legal entity to its single unified profile.
- Market rank attributes to understand how a merchant ranks relative to local competition.

### GraphQL API

Enigma offers a flexible GraphQL API to stream intelligence directly into your CRM or custom applications.

- Query businesses, brands, operating locations, and their relationships using GraphQL.
- Supports complex, nested queries to retrieve exactly the data you need in a single request.
- Endpoint: `https://api.enigma.com/graphql`

### Know Your Business (KYB) Verification

The KYB API queries Enigma's business data, which includes authoritative data sets, especially official Secretary of State records. Optionally, it can also perform Tax Identification Number (TIN) checks and sanctions screening.

- Verification tasks include: name verification, address verification, Secretary of State name/address verification, TIN verification, and OFAC watchlist screening.
- Requests must include at least two of the business name, business address, or person objects.
- Configurable `match_threshold` (minimum confidence 0–1) and `top_n` (number of matches returned).
- Supported add-on attributes include TIN Verification, SSN Verification, and OFAC Watchlist Screens. These add-ons must be enabled on your account by the sales team.
- Two KYB packages are available, offering different levels of detail (identity confirmation vs. full verification).
- Enigma offers U.S. business data and identity verification only. It does not support KYB for businesses outside the U.S.

### Customer and Transaction Screening

Enigma provides screening capabilities for compliance use cases, allowing you to screen businesses and persons against government watchlists (e.g., OFAC sanctions lists). Businesses and owners can be screened across watchlists that are refreshed on a weekly basis.

### Lead List Generation and Sales/Marketing

Enigma data supports go-to-market workflows:

- Build your own prospect database based on custom criteria including real revenues, growth, payment platforms used, industry, location, contact information and more.
- Qualify inbound leads using business data attributes.
- Augment your CRM with dynamic, underwriting-quality intel about business identity and financial health.

### Batch Enrichment

For large-scale data operations, Enigma supports batch enrichment workflows through CSV file uploads via the Enigma Console or file delivery, in addition to the API.

## Events

The provider does not support events. Enigma's API is request-based and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
