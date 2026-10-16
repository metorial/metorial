# APIVerve Integration Specification

## Overview

The integration provides dedicated tools for validation, text processing, currency conversion, weather, IP geolocation, DNS, SSL certificates, and QR generation. A generic tool calls other documented JSON GET and POST endpoints. Dedicated tool families follow APIVerve's API categories.

## Authentication and requests

APIVerve uses an API key in the `X-API-Key` header. Create a key in the APIVerve dashboard. No OAuth exchange or refresh is required. Requests use `https://api.apiverve.com/v1/` and the documented method and parameters for each endpoint. Generic endpoint names and `/endpoint` paths are constrained to this API origin and version.

Responses use `status`, `error`, and `data`. Provider errors and malformed required data produce an actionable service error. Premium fields can be absent; no fabricated values are returned for them. Dedicated tools expose the original provider data where useful, retaining provider null values. Legacy email SMTP fields and premium SSL subject, issuer and serial details are returned only when the provider includes them.

## Tools

- Validate email and phone numbers.
- Retrieve weather by city or a legacy ZIP input, with optional forecast control.
- Convert currencies and inspect IP location, DNS records, and SSL certificates.
- Analyze sentiment, check spelling, and translate text with optional source-language detection.
- Generate a downloadable QR code, retaining its existing file metadata. Expired QR links are renewed by generating the same content again; renewal uses the normal API credit cost.
- Read account plan, credit balance, rate limit, and renewal date without spending credits.
- Call documented JSON GET and POST utility endpoints, with generated-file URLs delivered as downloads when the result includes `downloadURL`.

## Limitations

The generic tool does not implement multipart uploads, alternate response formats, GraphQL, or provider batch orchestration. APIs with other file response conventions need a dedicated tool. The public documentation provides account usage, but no suitable API-key-authenticated self/profile endpoint; account usage is not presented as user identity. APIVerve documents synchronous request/response APIs, so no triggers are registered.

QR and barcode links are temporary. Dedicated QR downloads and generic POST calls to qrcodegenerator or barcodegenerator renew through the original generation request and options; renewal can produce a new file identifier and uses credits. Other generic file downloads retain the provider link's original lifetime.

## Official references

- [Authentication](https://docs.apiverve.com/authentication)
- [Endpoint catalog](https://docs.apiverve.com/api-endpoints)
- [Response format](https://docs.apiverve.com/response-formats)
- [Error handling](https://docs.apiverve.com/error-handling)
- [Analytics API](https://docs.apiverve.com/analytics-api)
- [QR code generation](https://docs.apiverve.com/ref/qrcodegenerator)
