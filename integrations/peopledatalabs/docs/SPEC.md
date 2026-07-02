# Slates Specification for People Data Labs

## Overview

People Data Labs (PDL) is a data provider that maintains a dataset of billions of person and company profiles. It offers APIs to enrich, search, and identify person and company records using attributes like name, email, phone, employment, education, and social profiles. The platform also provides IP enrichment, job title/skill enrichment, and data cleansing utilities.

## Authentication

There are three ways to authenticate requests: in the URL, in the header, or via SDKs.

**API Key Authentication:**

In order to use the APIs, you need to have an API key. You can get the API key by signing up on the People Data Labs Website. API keys are managed in the PDL dashboard at `https://dashboard.peopledatalabs.com`.

- **As a query parameter:** Include `api_key=YOUR_API_KEY` in the URL query string.
  - Example: `https://api.peopledatalabs.com/v5/person/enrich?api_key=YOUR_API_KEY`
- **As a request header:** Pass the API key via the `X-Api-Key` header.
  - Example: `X-Api-Key: YOUR_API_KEY`

API requests without proper authentication (a valid API key) will fail with a 401 error. There are no OAuth flows or scopes; authentication is solely API key-based.

A **sandbox mode** is also available for testing purposes, which returns fictitious data and does not consume credits.

## Features

### Person Enrichment

Enrich data on a person by performing a one-to-one match against nearly three billion individual profiles. Once matched, you have access to fields including names, addresses, employment information, and social media accounts. Input parameters include name, email, phone, social profile URL, company, school, and location. A bulk enrichment option is available for processing multiple records in a single request.

### Person Search

The Person Search feature gives you access to every profile in the full Person Dataset, which you can filter and segment using a search query. You can build a search query from any fields in the Person Schema to target only the person profiles that you are interested in. Queries can be written in SQL or Elasticsearch syntax.

### Person Identify

Use broad search inputs to retrieve multiple records from the person dataset. This enables searching through a single identifying attribute, such as name, email, phone number, company, school or location, in addition to using any combination of these attributes. The API scores and sorts all matching records based on the strength of their association with the input parameters.

- Returns up to 20 of the best matching profiles, ranked by match score.
- Useful for building comprehensive profiles when you have partial or ambiguous information about an individual.

### Person Retrieve

Retrieve a specific person record using a unique PDL Person ID. A PDL ID is a unique and permanent identifier for each record in the dataset, allowing you to directly retrieve the data for the exact record you are interested in.

### Company Enrichment

Enrich data on a company by performing a one-to-one match with the company profiles hosted in the dataset. Input can include company name, website, LinkedIn URL, or ticker symbol.

### Company Search

Access every record in the full Company Dataset, which you can filter and segment using a search query. Supports SQL and Elasticsearch query syntax, similar to Person Search.

### IP Enrichment

Enrich data on an IP address by performing a one-to-one match against nearly 2 billion IPs. Once matched, you can view the location, company, and metadata info associated with the IP address. Supports both IPv4 and IPv6 formats.

### Job Title Enrichment

Enrich data on a job title by performing a one-to-one match with those included in the Job Title Dataset. Returns standardized job title information.

### Skill Enrichment

Enrich data on a skill by performing a one-to-one match with those included in the Skill Dataset.

### Data Cleaner APIs

Clean the company, location, and school data that you employ in your API queries. PDL uses these same APIs for standardizing data as part of their data build process. Three cleaners are available:

- **Company Cleaner:** Standardize raw company name strings.
- **Location Cleaner:** Standardize raw location strings into structured location data.
- **School Cleaner:** Standardize raw school name strings.

### Autocomplete

Get suggestions for Search API query values along with the number of available records for each suggestion. For example, schools starting with "stanf". Useful for building type-ahead search interfaces.

### Changelog

Track changes to person records between dataset versions. Allows filtering by change type (e.g., updated records) between specified origin and target dataset versions.

## Events

The provider does not support events. People Data Labs does not offer webhooks, event subscriptions, or purpose-built polling mechanisms. It is a query-based data enrichment and search API.
