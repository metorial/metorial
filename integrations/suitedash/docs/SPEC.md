# SuiteDash integration specification

## Sources

Verified on 2026-10-14 against the public official documents:

- [Secure API help](https://help.suitedash.com/article/550-secure-api)
- [Interactive API reference](https://app.suitedash.com/secure-api/swagger)
- [OpenAPI document](https://app.suitedash.com/secure-api/swagger/json-file)
- [Contact roles](https://help.suitedash.com/article/6-difference-between-lead-prospect-client)
- [Contact requirements](https://help.suitedash.com/article/65-creating-a-new-contact)
- [Company requirements](https://help.suitedash.com/article/67-understanding-companies)

## Authentication

Requests use the account Public ID and Secret Key in `X-Public-ID` and
`X-Secret-Key` headers. Create keys under Flyout Menu > Integrations > Secure API.
Access requires an Admin or Super Admin account. Monthly API limits depend on the
account plan. A 403 response indicates that the account is inactive; another key
will not resolve it.

## CRM tools

| Tool | Official request | Result |
| --- | --- | --- |
| `create_contact` | `POST /contact` | Complete provider response in `contact` |
| `update_contact` | `PUT /contact/{identifier}` | Complete provider response in `contact` |
| `list_contacts` | `GET /contacts?page={page}` | Contact records, total pages, and total items |
| `get_contact` | `GET /contact/{identifier}` | Complete provider response in `contact` |
| `create_company` | `POST /company` | Complete provider response in `company` |
| `update_company` | `PUT /company/{identifier}` | Complete provider response in `company` |
| `list_companies` | `GET /companies?page={page}` | Company records, total pages, and total items |
| `get_company` | `GET /company/{identifier}` | Complete provider response in `company` |
| `get_metadata` | `GET /contact/meta` | Contact attribute definitions in `metadata` |
| `get_company_metadata` | `GET /company/meta` | Company attribute definitions in `metadata` |
| `subscribe_marketing_audience` | `POST /marketing/subscribe` | Complete provider response in `result`, including each subscriber outcome |

Contact lookups accept a UID or email. Company lookups accept a UID or exact name.
Identifiers are encoded as individual URL path segments. Updates retain the
existing `contactUid` and `companyUid` inputs.

Contact inputs retain the roles `lead`, `prospect`, and `client`; requests map
these to the provider's `Lead`, `Prospect`, and `Client` values. Company roles
already use the provider's title case. Creating a Prospect or Client contact
requires an email address. Creating a Prospect or Client company requires a
primary contact email. When creating a primary contact, first and last names are
required. Set `createPrimaryContactIfNotExists` to false to select an existing
contact by email without creating one.

Contact `customFields` values retain their existing arbitrary JSON types. Direct
custom field UUID keys are sent under the documented `custom_fields` object;
provider-shaped nested `custom_fields` and other supplied attributes pass through.
Explicit nested custom field values take precedence over duplicate direct UUID
keys. Call `get_metadata` to discover the account-specific field identifiers.
Company metadata describes public, private, and target custom fields, but the
current company write tools expose their existing standard fields only.

An omitted list page fetches all pages. An explicit page must be a positive whole
number. The existing numeric input type is preserved. Provider `totalItems` maps
to the existing `total` output. Idle companies are excluded by the provider.

## Marketing subscriptions

The existing `contactIdentifiers` array accepts emails and contact UIDs. UIDs are
resolved through `GET /contact/{identifier}` before submitting an email-based
subscriber. Contacts without an email cannot be subscribed. The existing string
`audienceIdentifier` accepts a positive numeric audience ID, which is sent as an
integer in each subscriber's `audiences` array. The provider expects a JSON array
of subscribers, not a contacts/audience object.

HTTP 200 may represent partial success. The complete response and individual
errors remain in `result`, and the message reports successful and failed items.
Do not assume that every submitted contact subscribed successfully.

## Limits and verification

There is no documented self/account identity endpoint in the inspected OpenAPI
reference. Project and Worlds endpoints exist but are outside this CRM-focused
refresh. Existing contact role-update input is retained; `ContactUpdate` omits a
role property, so changing an existing contact's role requires provider runtime
confirmation rather than assuming the capability was removed. Metadata responses
can be nullable in the provider schema. The existing `get_metadata` retains its
object output contract; the new `get_company_metadata` preserves a nullable response.

Local builds, formatting, and schema checks do not establish provider acceptance.
No live provider calls, E2E tests, or tool-use evals were run for this refresh.
