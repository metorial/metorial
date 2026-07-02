Now I have a comprehensive view of API Ninjas' offerings. Let me verify the authentication details from a specific API doc page.

# Slates Specification for API Ninjas

## Overview

API Ninjas is a data API platform that provides over 100 production-ready REST APIs across categories such as finance, technology, AI/computer vision, places, text processing, transportation, health, and entertainment. All APIs are accessible through a single API key and a unified base URL (`https://api.api-ninjas.com/v1/`). The platform is read-only and data-oriented — it serves reference data, real-time market data, and utility functions rather than managing user resources.

## Authentication

API Ninjas uses **API Key** authentication. A single API key grants access to all available APIs.

- **How to obtain**: Sign up for a free account at [api-ninjas.com](https://api-ninjas.com/register). The API key is available in your account dashboard.
- **How to pass the key**: Include the API key in the `X-Api-Key` HTTP request header on every request.

Example:

```
GET https://api.api-ninjas.com/v1/quotes
X-Api-Key: YOUR_API_KEY
```

There are no OAuth flows, scopes, or additional credentials required. Some premium APIs or features (e.g., non-.com domain lookups) require a paid subscription, but authentication remains the same.

## Features

### Finance Data

Access real-time and reference financial data including stock prices, commodity prices, cryptocurrency prices, exchange rates, currency conversion, ETF details, mutual fund info, market capitalization, earnings reports, earnings call transcripts, insider trading data, and S&P 500 company data. Also includes banking utilities such as BIN lookup, IBAN validation, SWIFT code search, and routing number lookup.

### Tax & Economic Data

Retrieve tax rates (income tax, sales tax, property tax, VAT), inflation data, interest rates (central bank, LIBOR, mortgage), GDP data, and unemployment statistics. Includes calculators for income tax, sales tax, and mortgage payments.

### Internet & Technology Utilities

Tools for domain availability checks, WHOIS lookups, DNS and MX record lookups, IP geolocation, email validation, disposable email detection, phone number validation, URL lookup, user agent parsing, and web scraping. Also includes generators for barcodes, QR codes, and passwords.

### AI & Computer Vision

Machine learning-powered APIs for text sentiment analysis, text similarity scoring, text embeddings, face detection, image-to-text (OCR), and object detection in images.

### Places & Geography

Location data including country statistics, city data, geocoding/reverse geocoding, timezone info, postal/zip code lookup, air quality, weather, population data, GDP, working days by country, world time, and country flag images.

### Text Processing

Dictionary lookups, thesaurus (synonyms/antonyms), rhyming words, spell checking, language detection, profanity filtering, lorem ipsum generation, and random word generation.

### Health & Wellness

Nutrition data extraction from natural language text, calorie burn calculations, exercise lookups by muscle group, cocktail and recipe search, and hospital information (US).

### Entertainment & Trivia

Quotes, jokes, dad jokes, Chuck Norris jokes, facts, trivia questions, riddles, horoscopes, celebrity info, historical events, historical figures, advice, bucket list ideas, hobbies, emoji data, sudoku puzzles, and day-in-history lookups.

### Animals

Reference data for animal species, cat breeds, and dog breeds.

### Transportation

Technical specifications for aircraft, helicopters, motorcycles, and cars. Airport data, electric vehicle info, EV charger location search, and VIN lookup.

### Miscellaneous Utilities

Baby name generation, custom numerical counters, holiday dates, public holidays, company logo images, planetary and star data, random image generation, random user data generation, unit conversion, and university information (US/Canada).

## Events

The provider does not support events. API Ninjas is a stateless, data-retrieval-only platform with no webhooks, event subscriptions, or polling mechanisms.
