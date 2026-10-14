# BigMailer Integration Specification

BigMailer supports email marketing and transactional campaigns across multiple brands.

## Authentication

API calls use `X-API-Key` against `https://api.bigmailer.io/v1`. Create a key with the actions needed for your workflow. Identity and connection verification use `GET /me`.

## Supported workflows

- Discover account identity and authorized brands; create and update brands.
- List, retrieve, upsert, and delete contacts by ID or email address.
- Create and update contact lists; list lists and custom fields; create custom fields.
- List, create, and delete sender identities.
- Create bulk campaigns and retrieve individual campaigns or paginated campaign summaries.
- Discover transactional campaigns, then send through an active, configured campaign.

Create and update endpoints return a resource ID. Tools retrieve that resource after a successful mutation to return its details, so API keys also need the corresponding read action. If that retrieval fails, the error includes the accepted resource ID; retry retrieval before repeating the mutation.

List endpoints return a page, a cursor, and `has_more`. They do not document total counts; tools omit `total` when BigMailer does not provide it.

A new brand requires `name`, `fromName`, and `fromEmail`. A bulk campaign requires `name`. Contact custom field names must match an existing field tag, and each field value must contain exactly one string, date, or integer value. Email validation requires purchased validation credits. Transactional send acceptance does not confirm delivery.

## Official references

- [API authentication and identity](https://docs.bigmailer.io/docs/getting-started-api)
- [Create brand](https://docs.bigmailer.io/reference/createbrand)
- [Upsert contact](https://docs.bigmailer.io/reference/upsertcontact)
- [Get bulk campaign](https://docs.bigmailer.io/reference/getbulkcampaign)
- [List transactional campaigns](https://docs.bigmailer.io/reference/listtransactionalcampaigns)
- [Send transactional email](https://docs.bigmailer.io/reference/sendtransactionalcampaign)
