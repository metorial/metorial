# Slates Specification for Klazify

## Overview

Klazify is a Content Classification API that turns any website, domain, IP address, or email into a complete company profile. It provides categories, brand logos, social media links, and structured business data in real time. Its classification taxonomy covers 620+ categories based on the IAB Content Taxonomy v3.

## Authentication

Klazify uses API key-based authentication. Users sign up to Klazify to get an API key and some credits to get started. The API key is generated from the Klazify account dashboard in the API section.

The API key is passed as a Bearer token in the `Authorization` header of each request:

```
Authorization: Bearer YOUR_API_KEY
```

Klazify uses API keys for authentication. There are no OAuth flows, scopes, or additional credentials required. All API requests are made to `https://www.klazify.com/api/` endpoints with this single key.

## Features

### Website & Domain Categorization

Gives developers the ability to look up the categories of a particular URL, website, domain name, or IP address. Uses a machine learning engine to scan a website's content and meta tags, extracting text to classify the site and assign up to three categories aided by natural language processing.

- Three top-level category structures are available, including deep categorization via IAB taxonomy or simpler category structures.
- Each category includes a confidence score ranging from 0 to 1.
- Can categorize mobile apps using their Google Play Store or Apple App Store download URLs in real-time.
- Depending on the subscription plan, certain endpoints may or may not be available.

### Company Data Enrichment

Provides a full company profile from any URL or email, including revenue, employee range, industry classification, logos, tech stack, social media links, HQ location, and more.

- Input can be a domain URL or an email address.
- Revenue info is estimated and may be updated monthly for public companies (quarterly) or estimated based on location and employee count for private companies.

### Logo Retrieval

Retrieves any company's up-to-date logo in real time, returning results even for the newest and most obscure brands with a single API call.

- Returns a URL to the logo image.

### Social Media Links

Retrieves the list of social media channel links for a domain, providing updated social media links in real time.

- Supported platforms include Facebook, Twitter, Instagram, Medium, YouTube, Pinterest, LinkedIn, and GitHub.

### Technology Stack Detection

Returns the technological stack utilized by the requested website.

### Competitors & Similar Domains

With one API call, returns a list of domains of potential competitors and similar domains, based on the category and target market of a given URL.

- Useful for market research and competitive analysis.

### Parked Domain Detection

Allows checking if a domain is actually parked and/or for sale. Some parked domains may show suspicious advertisements or redirect users to third-party websites that may be unsafe.

- Can be used for threat prevention and domain portfolio auditing.

### Domain Registration Data

The API returns domain registration information including domain age, registration date, expiration date, and days until expiration.

### Batch Enrichment via CSV

Users can upload a CSV file containing URLs or email addresses to be enriched with Klazify data, requiring no development skills — simply upload the file and select the endpoint to use.

## Events

The provider does not support events. Klazify is a request-response API for data enrichment and classification; it does not offer webhooks, event subscriptions, or built-in polling mechanisms.
