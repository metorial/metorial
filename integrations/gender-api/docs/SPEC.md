# Slates Specification for Gender API

## Overview

Gender API (gender-api.com) is a service that predicts the gender of a person based on their first name, full name, or email address. It provides gender classification with accuracy/probability scores and supports localization by country for improved results. The API also offers country-of-origin prediction for given names.

## Authentication

Gender API uses **API key** authentication. Users obtain an API key from their Gender API account.

- **API v1**: The API key is passed as a query parameter `key` on every request.
  - Example: `GET https://gender-api.com/get?name=Elizabeth&key=YOUR_API_KEY`
- **API v2**: The API key is passed as a Bearer token in the `Authorization` header.
  - Example header: `Authorization: Bearer YOUR_API_KEY`

No OAuth or additional credentials are required. The API key is available from the account dashboard after registration.

## Features

### Gender Detection by First Name

Determine the likely gender (male, female, or unknown) of a given first name. The response includes the predicted gender, an accuracy score indicating reliability, and the number of matching samples in the database.

### Gender Detection by Full Name

Accepts a full name (e.g., "Theresa Miller") and automatically splits it into first and last name components before determining gender. A `strict` mode option controls whether last names not found in the database are still extracted or returned as null.

### Gender Detection by Email Address

You can query gender using an email address. The API extracts the first and last name from the email address and returns the predicted gender along with the detected mail provider.

### Localization

Improve prediction accuracy by providing geographic context. Localization can be specified via:

- **Country code**: An ISO 3166-1 alpha-2 country code (e.g., `IT` for Italy, `DE` for Germany). This is important because some names differ by country — for example, "Andrea" is predicted as male in Italy but female in Germany.
- **IP address**: The API geolocates the IP to determine the country.
- **Browser locale**: A locale string (e.g., `en_US`, `de_DE`) is used to infer the country.

### Country of Origin Prediction

This feature returns the most likely countries of origin for a given first name, with probability scores for each country, along with continental and statistical region information. The response also includes a link to an interactive map visualization. This feature is marked as experimental and may not deliver consistent quality across all regions.

### Account Statistics

Retrieve account usage statistics including remaining request credits, monthly starting credits, and purchased credits. This is useful for monitoring consumption and avoiding service interruptions.

## Events

The provider does not support events. Gender API is a stateless lookup service with no webhooks or event subscription mechanisms.
