# Slates Specification for Neutrino

## Overview

Neutrino API is a collection of general-purpose utility APIs that provide data validation, security, telephony, geolocation, imaging, and e-commerce tools. It offers services such as email/phone validation, IP intelligence, geocoding, BIN lookups, image processing, content filtering, and SMS/voice verification.

## Authentication

All API requests must be authenticated using an API key and your user ID.

Two parameters are required for every request:

- **user-id**: Your static account user ID, assigned upon registration and cannot be changed.
- **api-key**: An API key generated from your Neutrino account dashboard. You can create multiple API keys per account.

The authentication parameters can be sent with POST, GET or as HTTP headers.

When authenticating via HTTP headers, the `api-key` header may also combine both credentials in the format: `API-Key: your-user-id:your-api-key`.

There is no OAuth or token-based authentication. The user ID and API key are obtained by signing up at [neutrinoapi.com](https://www.neutrinoapi.com/signup/).

## Features

### Data Validation & Cleaning

Parse, validate, and clean email addresses and phone numbers. Detect disposable or invalid emails and identify phone number types, carriers, and country of origin. Also includes a bad word filter for content moderation with configurable strictness levels ("strict" for children's content, "obscene" for adult audiences) and a user agent parser.

### Unit & Currency Conversion

Convert between currencies and measurement units using a single conversion tool.

### Telephony & Verification

Send security codes via SMS or automated phone calls for two-factor authentication. Verify security codes, send free-form SMS messages, and play back audio messages to phone numbers. All telephony APIs include a "limit" option to restrict the number of calls or SMS to a particular number, useful for abuse, fraud, and cost controls. HLR Lookup connects to the global mobile network to check mobile device status and carrier details.

### Geolocation

Geocode addresses to coordinates and reverse geocode coordinates to addresses. Look up geolocation and ISP information for IP addresses, including reverse DNS.

### Security & Networking

- **IP Blocklist**: Detect potentially malicious or dangerous IP addresses against known blocklists.
- **Host Reputation**: Check the reputation of an IP address, domain name or URL against a comprehensive list of blacklists and blocklists.
- **Domain Lookup**: Retrieve DNS and WHOIS information for domains.
- **Email Verify**: Perform SMTP-based email address verification to confirm real, deliverable mailboxes.
- **IP Probe**: Detect ISPs, hosting providers, and VPN/proxy usage for a given IP.

### E-Commerce

Perform BIN (Bank Identification Number) or IIN (Issuer Identification Number) lookups to identify card issuers, types, and countries. Download the full BIN database for local use.

### Imaging

- **HTML Render**: Render HTML content to PDF, JPG or PNG based on the latest Chromium browser engine. Fully supports HTML5, CSS3, SVG and JavaScript with configurable rendering options.
- **Image Resize**: Resize images and output as JPEG or PNG.
- **Image Watermark**: Overlay one image onto another with configurable position and opacity.
- **QR Code**: Generate QR codes as PNG images with customizable size, foreground, and background colors.

### Web Tools

- **Browser Bot**: Programmatically load and interact with web pages.
- **HTML Clean**: Sanitize and clean HTML content.
- **URL Info**: Retrieve metadata and information about a URL including page title and language.

## Events

The provider does not support events. Neutrino API is a stateless utility API platform with no webhook or event subscription mechanism.
