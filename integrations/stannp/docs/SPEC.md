# Stannp API integration

Stannp automates direct mail through recipients, mailing groups, individual letters and postcards, and bulk campaigns.

## Authentication

Connect with an API key and select the account region. US requests use `https://api-us1.stannp.com/v1/`; UK/EU requests use `https://api-eu1.stannp.com/v1/`. Requests use HTTPS and HTTP Basic authentication with the API key as the username and an empty password. POST bodies use form encoding. Existing connections retain their saved region until reconnected.

[Authentication and responses](https://www.stannp.com/us/direct-mail-api/guide), [UK/EU guide](https://www.stannp.com/uk/direct-mail-api/guide).

## Mail and recipients

`send_postcard` accepts an existing recipient or inline address and a template or front artwork. `send_letter` accepts an existing recipient or inline address and either a template or a PDF/DOC file, up to 25 pages. Test mode creates a sample without dispatch or charges. Generated PDFs are downloadable; existing PDF URL metadata remains available.

Recipient and group tools support paginated discovery, creation, removal, and group membership changes. Address validation requires an address line and a city or postal code; validation is available for US and UK addresses.

[Postcards](https://www.stannp.com/us/direct-mail-api/postcards), [letters](https://www.stannp.com/us/direct-mail-api/letters), [recipients](https://www.stannp.com/us/direct-mail-api/recipients), [groups](https://www.stannp.com/us/direct-mail-api/groups), [addresses](https://www.stannp.com/us/direct-mail-api/addresses).

## Campaign workflow

Create a campaign with a recipient group and artwork or a template. Prefer the documented `a6-postcard`, `a5-postcard`, or `letter` campaign types. The existing `postcard` option maps to `a5-postcard` for A5 size and otherwise to `a6-postcard`. Other existing type choices remain available for compatibility.

Call `get_campaign_sample` to review a PDF before approving the campaign. Sample links last 30 minutes and are renewed before expiry. Approve the campaign to lock its design and selected recipients, check its cost, then use `list_booking_dates` and `book_campaign` to schedule dispatch. Deletion is restricted by the provider to unbooked campaigns.

[Campaign API](https://www.stannp.com/us/direct-mail-api/campaigns).

## Reporting and balance

Reporting tools expose status totals and individual mailpieces over an inclusive date range. When filtering by a tag, supply a status because the tag follows the status in the API path. Account tools expose available balance and existing identity metadata.

[Reporting](https://www.stannp.com/us/direct-mail-api/reporting), [account balance](https://www.stannp.com/us/direct-mail-api/account).
