# Slates Specification for Dropcontact

## Overview

Dropcontact is a B2B contact data enrichment service that finds, verifies, and qualifies professional email addresses and enriches contact and company information using proprietary real-time algorithms without relying on stored databases. It is GDPR-compliant by design and operates on a pay-on-success credit model.

## Authentication

Dropcontact uses access tokens to allow access to the API.

- **Method:** API Key (Access Token)
- **Header:** Include `'X-Access-Token': apiKey` in your header for authentication.
- **Obtaining the key:** Your personal API key is available in your Dropcontact account under the API tab.
- **Base URL:** `https://api.dropcontact.com/v1/`

No OAuth flow or additional scopes are required. Simply pass the access token in the `X-Access-Token` request header on every API call.

## Features

### Contact & Company Enrichment

The core feature of the API. You can find and enrich all your B2B contacts. If there is no email address specified for your contact, it adds the business email address based on its name, surname and company. Otherwise, it verifies and qualifies any email address, and finds business email addresses.

- **Input options:** You can provide combinations of email, first name, last name, full name, company, website, LinkedIn URL, phone, job title, SIREN/SIRET numbers, and country code.
- **Minimum required input:** One of: (first_name + last_name + company), (full_name + company), a LinkedIn URL, or an email address.
- **Language:** Results can be returned in English or French (default) via the `language` parameter.
- **SIREN enrichment:** Set `siren: true` to receive French company registration data (SIREN, SIRET, NAF code, VAT number, company address, leader info).
- **Custom fields:** You can pass custom key-value pairs that will be preserved in the response without modification.

### Email Qualification

For each email address, the API qualifies the local part and the domain to form a string such as: local_qualification@domain_qualification. Local part qualifications include: nominative, catch_all, generic, random, and invalid. Domain qualifications include: pro, perso, and invalid.

### Enriched Data Returned

The API can return: civility, first name, last name, full name, qualified email addresses, phone number, mobile phone, company name, website, personal LinkedIn URL, company LinkedIn URL, SIREN, SIRET, SIRET address/zip/city, VAT number, number of employees, NAF code and description, country, company turnover, company results, job title, job level, and job function.

- The information returned depends on the information provided as input.
- If no email address can be found or verified for the provided input, Dropcontact returns the original input data without modification.

### Credits Management

You can check your remaining credits by sending a POST request with an empty data object. 1 credit = 1 email found or verified. If Dropcontact doesn't find an email, you get your credit back.

## Events

Dropcontact supports webhooks to notify you when enrichment results are ready.

### Enrichment Result Ready (`enrich_api_result`)

Instead of polling the API every 30 seconds, you can use webhooks to get notified when your data is ready. You can only create a single subscription and for now only the event `enrich_api_result` is available.

There are two ways to configure webhooks:

- **Per-request callback URL (recommended):** Include a `custom_callback_url` field directly in the enrichment POST request body. No prior setup needed.
- **Default webhook URL:** Set a single default callback URL for your account via a dedicated endpoint. This URL is used for all requests that don't specify a `custom_callback_url`.

The webhook payload contains the enriched contact data, the original request ID, the event type, and a timestamp. Only one default webhook URL is allowed per account, and `custom_callback_url` takes precedence over the default when both are set.
