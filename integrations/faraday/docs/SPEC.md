Now let me get more details on the webhook events and the lookup API feature:# Slates Specification for Faraday

## Overview

Faraday (faraday.ai) is a predictive AI platform that helps businesses predict customer behavior such as likelihood to convert, churn, repurchase, and forecasted spend. It provides an Identity Graph with 1,500+ consumer attributes on 240M+ US adults, and allows users to build predictive pipelines—ingesting data, defining cohorts, training outcomes, and deploying predictions via API or to external systems.

## Authentication

Faraday uses **Bearer token (API key)** authentication.

- Obtain your API key from the [Settings page](https://app.faraday.ai/settings) in the Faraday dashboard.
- Include the API key in the `Authorization` header of every request:
  ```
  Authorization: Bearer YOUR_API_KEY
  ```
- The API base URL is `https://api.faraday.ai/v1`.
- There are no OAuth flows, scopes, or additional credentials required. A single API key provides access to all resources within the associated account.

## Features

### Data Ingestion (Datasets, Uploads, Connections)

Ingest first-party customer data into Faraday. You can upload CSV files directly, or configure connections to external data sources including Snowflake, BigQuery, Redshift, Postgres, MySQL, S3, GCS, Shopify, Stripe, Salesforce, Segment, SFTP, and many others. Datasets define how imported data maps to Faraday's identity model and event streams.

- Connections support both import and export directions.
- Credentials for connections can be rotated via the API.

### Event Streams

Extract structured event data (e.g., transactions, signups, cancellations) from datasets. Streams represent typed sequences of customer actions with timestamps and optional values (like transaction amounts), which feed into cohorts and predictions.

### Cohorts

Define populations of people based on event stream criteria (e.g., customers, leads, churned customers, repeat purchasers, one-time buyers). Cohorts serve as inputs for predictions and as population/exclusion filters in scopes.

- Membership counts over time are available for analysis.

### Outcomes (Propensity Predictions)

Declare predictive objectives such as likelihood to convert, likelihood to churn, likelihood to buy again, or other custom business outcomes. Faraday trains ML models using your first-party data combined with its Identity Graph.

- Supports bias mitigation on sensitive dimensions (age, gender) with equality or equity strategies.
- Model analysis reports including feature importances and strategy details are available.

### Forecasts

Generate spend forecasts and lifetime value (LTV) predictions for customer cohorts over configurable time horizons.

### Persona Sets (Customer Segmentation)

Segment cohorts into AI-generated persona clusters. Each individual is assigned to a persona, with trait breakdowns and flow analysis over time available.

- The number of personas and their naming can be customized.

### Recommenders

Create product or content recommendation models that suggest next-best-offer or first-best-offer for individuals based on stream data, eligibility rules, and predictors. Supports bias mitigation configuration.

### Scopes (Prediction Deployment Configuration)

Combine a target population (cohorts), exclusion cohorts, and a payload of predictions (outcomes, persona sets, recommenders, cohort memberships, traits) into a deployable unit. Scopes define what predictions are generated for whom.

- Efficacy and analysis reports are available per scope.

### Targets (Prediction Export)

Configure how and where predictions from a scope are delivered. Target types include:

- **Lookup API**: Real-time API for retrieving predictions about individuals by providing identity information (name, address, email, phone). Matches against Faraday's identity graph and returns propensity scores, persona assignments, cohort membership, and enriched attributes.
- **Pipeline targets**: Export predictions to external connections (databases, warehouses, cloud storage, ad platforms like Facebook, Google Ads, LinkedIn, Pinterest, TikTok, The Trade Desk).
- **CSV download**: Direct file download of prediction results.
- Targets support custom column naming and ad-platform-specific formatting.

### Traits and Attributes

Access Faraday-provided traits (1,500+ consumer attributes from the Identity Graph) and define custom traits derived from your own data. Traits can be included in scope payloads for enrichment and can be analyzed for population distribution breakdowns.

### Market Opportunity Analysis

Evaluate market potential by analyzing how cohorts compare against the broader US population, helping identify untapped opportunities.

### Places

Define geographic points of interest around which predictions can be focused, useful for location-based targeting and canvassing use cases.

### Feature Stores

Manage collections of engineered features used in model training and inference.

### Account & Billing Management

Manage account settings, sub-accounts, usage metrics, and billing information through the API.

### Resource Dependency Graph

Retrieve a complete dependency graph of all resources on an account, showing how datasets, streams, cohorts, outcomes, scopes, and targets relate to each other.

## Events

Faraday supports webhooks for event-driven notifications. You register webhook endpoints via the API, and Faraday sends POST requests to your configured URLs when events occur.

### Resource Errored

Triggered when any resource in your account enters an error state. The payload includes the `resource_id`, `resource_type` (e.g., scopes, outcomes, datasets, targets, cohorts, connections, etc.), and `account_id`.

- Applicable resource types: accounts, attributes, cohorts, connections, datasets, feature_stores, market_opportunity_analyses, outcomes, persona_sets, places, recommenders, scopes, streams, targets, traits.

### Resource Ready With Update

Triggered when a resource has been successfully updated and is ready. The payload includes the same structure as the errored event: `resource_id`, `resource_type`, and `account_id`.

- Useful for knowing when a prediction pipeline has finished processing and results are available for consumption.
