# LinkedIn Ads

Discover the connected member and authorized ad accounts, manage campaign groups, campaigns and creatives, query performance, submit conversion events and read sponsored lead forms and test or production submissions. The 21 tools use Marketing API version `202609` and account-scoped campaign and creative endpoints.

Advertising, read-only advertising, conversions and lead access use separate OAuth connections. Each requires the corresponding approved LinkedIn API products; connected-member discovery also requires Sign In with LinkedIn using OpenID Connect. Programmatic refresh is available only for approved partners that receive refresh tokens. Other connections must reauthorize when their token expires.

Use account discovery to supply exact IDs. Legacy resource-only calls can discover their account only within 20 authorized accounts and require exactly one match. Lists return continuation tokens. Lead discovery returns all exact string IDs in exactLeadForms, with an explicit omission count for the legacy numeric array. Lead requests check JSON.parse reviver-source support before dispatch and refuse runtimes that would round IDs. Analytics preserves the exclusive end-date input, translates it to LinkedIn's inclusive UTC day, and has no pagination beyond the provider's 15,000-row limit.

Creating or activating ads can incur spend in production accounts. Creative content references must point to existing provider content; post creation, asset upload, account creation, billing, webhooks and event creation are outside this integration. The existing creative content-update field remains accepted but returns guidance to create a new creative because the current API cannot replace its reference. Conversion-event success confirms acceptance, not matching or attribution.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
