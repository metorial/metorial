Let me get more details on the authentication and the email verification API.Now let me fetch the email verification API doc for completeness:# Slates Specification for Realphonevalidation

## Overview

RealPhoneValidation is a B2B data validation service that provides real-time phone number validation, Do Not Call list lookup, phone type identification, fraud risk scoring, reassigned number detection, and email verification. It dispositions US phone numbers 100% of the time and is US-only for most services. The real-time API uses live telco data — pinging the phone switch — for up-to-the-minute accuracy.

## Authentication

RealPhoneValidation uses **token-based authentication**. It requires an Authorization Token provided by RealPhoneValidation to utilize their API services.

- The token is a UUID-format string (e.g., `1234ABCD-1234-ABCD-1234-123456ABCDEF`) passed as a `token` query parameter or POST field on every API request.
- The token is obtained upon creating and activating a RealPhoneValidation account.
- There are no OAuth flows, scopes, or additional credentials — the single token is used across all API services.
- All API calls must be made over HTTPS with TLS v1.2+.
- Base URL: `https://api.realvalidation.com/rpvWebService/`

Example request:

```
https://api.realvalidation.com/rpvWebService/TurboV3.php?phone=7275555555&token=YOUR_TOKEN
```

## Features

### Phone Number Validation (Turbo)

Real-time phone number validation best used in web forms and apps when a complete overview of phone data is required. Returns connection status (connected/disconnected), phone type (mobile, landline, VoIP), carrier information, subscriber name (when available), and subscriber type (business or consumer).

- **Turbo V3**: Full data set including subscriber name and type.
- **Turbo Standard**: Best used when only connection status and phone type are needed.
- Input: 10-digit US phone number. Output can be XML or JSON.

### Phone Number Validation (Scrub)

Designed for list providers, data companies, and organizations with large lists/databases and tight budgets.

- **Scrub Plus**: Returns connection status and phone type.
- **Scrub**: Returns connection status only.
- May disposition up to 5% of US numbers as unknown.

### Active Number Check

Determines the basic usability of a phone number — whether it is active on a "still in business" phone service provider. Not to be confused with whether a phone is "connected" to an actual customer. This is a lower-cost alternative to Turbo/Scrub for basic checks.

### Wireless/Phone Type Identification

Identifies if the number is a cell phone, useful for staying TCPA compliant. Returns whether the number is mobile, landline, or VoIP.

### Do Not Call (DNC) Lookup

Determines if the number is on the National, State, or Direct Marketing Association Do Not Call lists. It also identifies phone type and if the number is associated with a known litigator or serial plaintiff.

- **DNC Lookup**: DNC status and phone type only.
- **DNC Plus**: Combines DNC Lookup with RPV Scrub to also return connection status, phone type, and TCPA litigator identification.

### Fraud Risk Scoring

Provides a phone risk score and other actionable data points, allowing you to identify possible fraud before it happens. You can customize your risk tolerance based on your specific needs.

### Reassigned Number Lookup

Determines if a phone number has been reassigned (changed ownership) since your last date of consent. Requires a `contact_date` parameter representing when consent was originally obtained.

### Email Verification

Validates email addresses in real-time to identify incorrect, disposable, and bogus addresses at the point of collection. Returns validity status (valid, invalid, unknown, accept_all), whether the email is connected to active online networks, and whether it is a disposable email address.

## Events

The provider does not support events. RealPhoneValidation is a request-response validation service with no webhook or event subscription mechanism.
