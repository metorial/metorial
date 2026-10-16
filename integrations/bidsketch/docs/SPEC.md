# Bidsketch integration

Bidsketch manages client records and business proposals built from opening sections, fees, and closing sections. This integration exposes 33 tools through its documented v1 JSON API.

## Authentication and limits

Use an administrator-created API token from Account Settings > API & Integration. Requests use `Authorization: Token token="<token>"` at `https://bidsketch.com/api/v1`. The API documents 100 requests per token in 20 seconds; collections default to 100 records, with `page` and `per_page` controls. Account limits can prevent client or proposal creation.

No OAuth refresh, current-user endpoint, or account-profile endpoint is documented. Connection configuration is empty.

## Capabilities

- Clients: list, get, create, update, and delete. Client deletion also removes its proposals. Creation requires first name, last name, and email. Optional company/full name, alternate phone, address, country, notes, and secondary contact are supported. `address` and `address2` map to the provider's address fields; `locale` maps to country.
- Proposals: list across the account or for one client, get metadata, optionally get full content, create from scratch or a saved template, update, delete, and read aggregate statistics. Creation takes a name and client ID. Display settings, percentage inputs for taxes and discounts, currency, and proposal date are supported. Tax and discount outputs are calculated amounts.
- Reusable fees and sections: list, get one, create, update, and delete. Fees support fixed, hourly, monthly, yearly, and custom pricing. Custom fees require a unit label. Sections support opening and closing placement and HTML content.
- Proposal fees and sections: list, get one, add, update, and remove. Fees can be optional. Individual proposal content is distinct from the reusable library.
- Templates: list and get, including referenced reusable fees and sections. The API documents read-only templates; a template can be used when creating a proposal.

Fee collection responses can omit per-unit amounts. Each fee list makes one request and returns `amount` only when the provider supplies an actual numeric amount. Use `get_fee` or `get_proposal_fee` for complete pricing details; totals and zero are never substituted for an omitted per-unit amount. Full proposal content requires a separate request after metadata retrieval. Explicit empty collections remain empty; malformed responses and missing required fields report an error.

The documented proposal section and fee collections omit app URLs. Those list outputs return `appUrl` only when the provider supplies one. Creation and update outputs retain their existing required fields and report an error if required response data is absent.

Sending proposals, changing acceptance/status, downloading PDFs, and an identity endpoint are not documented API capabilities. No event triggers are exposed.

## Official references

- [API documentation and authentication](https://github.com/Bidsketch/bidsketch-api)
- [Clients](https://github.com/Bidsketch/bidsketch-api/blob/master/sections/clients.md)
- [Proposals and proposal content](https://github.com/Bidsketch/bidsketch-api/blob/master/sections/proposals.md)
- [Reusable fees](https://github.com/Bidsketch/bidsketch-api/blob/master/sections/fees.md)
- [Reusable sections](https://github.com/Bidsketch/bidsketch-api/blob/master/sections/sections.md)
- [Templates](https://github.com/Bidsketch/bidsketch-api/blob/master/sections/templates.md)
