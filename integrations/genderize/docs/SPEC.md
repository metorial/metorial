# Slates Specification for Genderize

## Overview

Genderize.io is an API service that predicts the gender associated with a given name using statistical data. The API allows you to check the statistical probability of a name being male or female. The dataset covers the whole planet and supports scoping requests to specific countries.

## Authentication

Genderize supports two modes of access:

1. **No authentication (free tier):** The API is free for up to 100 names/day. No sign-up or API key is needed.

2. **API Key (paid plans):** You can sign up for an API key if you need more requests. API keys are obtained from the Genderize store at `https://store.genderize.io`. The API key is passed as a query parameter named `apikey`, e.g.:
   ```
   https://api.genderize.io?name=peter&apikey=YOUR_API_KEY
   ```

There is no OAuth or other complex authentication mechanism. The API key is the only credential needed for paid access.

## Features

### Gender Prediction

The API exposes a single endpoint that accepts a name and returns a payload with the prediction. The response includes a gender, probability, and a count. The probability indicates the ratio of males to females in the dataset, and the count indicates the amount of data rows examined for the response.

- **Name parsing:** It's recommended to always use a first name. If not, the API will attempt to parse the input as a full name and pick out the first name. Diacritics from any language as well as non-latin alphabets are supported.
- The prediction is binary (male or female) with an associated probability score.
- Names not found in the dataset will return a null gender.

### Country-Specific Localization

The endpoint supports localization, allowing you to scope the gender prediction to a single country for higher accuracy. The API accepts an optional `country_id` parameter. The service follows ISO 3166-1 alpha-2 for country codes.

- The dataset might be smaller for some countries, so it is worth checking the count and redoing the request globally if it's too low.

### Batch Prediction

The API allows you to infer the gender of up to ten names per request. To do so, send a list of names as the `name` parameter. The response will be a list of predictions.

- Using localization on a batch request will apply the given `country_id` to every name in the batch.

## Events

The provider does not support events.
