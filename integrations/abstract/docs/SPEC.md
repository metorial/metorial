# Abstract API integration

Abstract provides independent APIs for contact validation, enrichment, IP intelligence, finance, dates, and web content. Each API uses its own API key in the `api_key` query parameter. Enter only the keys for the products you intend to use. No OAuth, account identifier, or additional connection configuration is required.

The integration groups tools by API product so products can be enabled separately:

- Email Validation checks deliverability and format, with optional typo correction.
- Email Reputation adds sender and domain enrichment, risk signals, and known breaches.
- Phone Validation returns validity, country, format, carrier, and location.
- Phone Intelligence adds line status, registration, messaging, risk, and breach details.
- IP Geolocation returns location, network, timezone, flag, and currency information.
- IP Intelligence adds VPN, proxy, Tor, hosting, relay, mobile, and abuse signals.
- Company Enrichment looks up a domain or extracts the domain from an email address.
- Exchange Rates supports live rates, historical rates, and currency conversion.
- Public Holidays looks up country and date-specific holidays.
- Timezones supports current time and time conversion between locations.
- Web Scraping retrieves page HTML and supports JavaScript rendering and proxy requests.
- Website Screenshots generates downloadable JPEG or PNG images.
- Image Processing optimizes a remote image and provides its downloadable result when a result URL is returned.
- User Avatars generates downloadable PNG or SVG initials images.
- VAT supports number validation, price calculation, and country rate lookup.
- IBAN validates international bank account numbers.

Most lookup tools include the full provider response alongside convenient summaries. Unavailable summary values are omitted; provider nulls remain available in the full response. Product availability, response fields, quotas, and rate limits depend on the API and subscription.

Public Holidays requires a year when filtering by month, and a month and year when filtering by day. Free plans require all three date filters. Website screenshot `delay` retains its millisecond input and is converted to the provider's seconds. Avatar `fontScale` uses the provider's documented 0.1–1.0 fraction; the older `fontSize` value continues to be passed unchanged for compatibility.

Abstract's documented public API surface does not provide a current-account endpoint or webhook registration for these synchronous APIs.

Official documentation: https://docs.abstractapi.com/llms.txt
