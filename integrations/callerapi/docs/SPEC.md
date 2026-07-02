Let me get more details on the full documentation, especially around the phone info endpoint and the caller picture endpoint.# Slates Specification for Callerapi

## Overview

CallerAPI is a phone number intelligence and caller identification API. It provides real-time phone number lookup, spam/fraud detection, carrier validation (HLR), porting history, online presence checks, and caller ID data aggregated from multiple sources (Truecaller, Hiya, CallApp, etc.). It serves carriers, VoIP providers, dialers, and enterprises for fraud prevention and phone number validation.

## Authentication

CallerAPI uses API key authentication. Include your API key in the header of each request using the `X-Auth` header:

```
X-Auth: YOUR_API_KEY
```

The API key is obtained from the CallerAPI dashboard. No OAuth or other authentication methods are supported. All requests are simple GET requests authenticated via this header.

## Features

### Phone Number Lookup

Retrieve comprehensive information about a phone number by aggregating data from multiple caller ID providers (Truecaller, Hiya, CallApp, ViewCaller, EyeCon). Returns entity type, spam reputation, complaint history, business info (name, category, industry, location), and carrier info (carrier name, network type, country, porting status, timezone).

- Phone numbers should be in E.164 format.
- An optional `hlr=true` parameter can be included to add HLR (Home Location Register) data, which adds 1–3 seconds to response time at no additional cost.

### Caller ID Information

Retrieve detailed caller identification data from multiple third-party providers for a given phone number. Returns name, addresses, websites, social media profiles, business categories, ratings, opening hours, and spam scores from each source.

- Phone numbers should be in E.164 format.

### Caller Picture Retrieval

Retrieve the profile picture associated with a phone number. The phone number should be in E.164 format. The response is a base64-encoded image.

### Spam and Fraud Detection

The spam score (0–100) is calculated from recent complaints, call patterns, and carrier reports. Scores above 30 indicate potential delivery issues. Detailed complaint history is provided when available. Complaints include creation date, violation date, consumer state, subject, and whether it was a robocall.

### Ported Number Check

Check whether a phone number has been ported to a different carrier. Returns the current porting status of a given number.

### Porting History

Retrieve the complete history of porting events for a number, including action type, network identifiers, line type, and timestamps of each porting event.

### Port-Out Fraud Assessment

Assess the risk of port-out fraud for a number based on recent porting activity.

### Online Presence Check

Check if a number is linked to various online platforms and services, including WhatsApp, Telegram, Amazon, Google, Office 365, Instagram, LinkedIn, Twitter, Skype, and Viber.

- Platform availability may vary by country. Some platforms are only available in specific regions.

### Account Information

Retrieve information about the authenticated user, including email, credits spent, monthly credit allowance, and remaining credits.

## Events

The provider does not support events. CallerAPI is a request-response API for phone number lookups and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
