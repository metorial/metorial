# <img src="logo.jpeg" height="20"> ToneDen

Create, manage, and monitor advertising campaigns on Facebook and Google with unified audience targeting, budgeting, and A/B testing. Build smart links (FanLinks) that aggregate content across streaming platforms for music, podcasts, events, and tours. Set up social unlocks to gate content behind social actions and run contests to incentivize fan engagement. Use playbook-based campaign templates for automated marketing strategies like Spotify Growth and remarketing. Create custom user lists for ad targeting, upload offline conversion data, and retrieve campaign performance insights and creative-level analytics. Manage user profiles and list associated campaigns, links, and attachments.

Connect with an approved OAuth application from ToneDen's [Developer Settings](https://www.toneden.io/settings/developer). Each authorization grants access to the selected artist profile; connect each profile separately. Use `get_profile` without a user ID to identify the connected profile. The official authorization-code documentation returns a bearer token and does not specify token expiry or a refresh-token flow.

List tools return one page. Pass `offset` and `limit` to request subsequent pages; omitted pagination and status values retain ToneDen's defaults. Campaign budgets use the lowest currency denomination, such as cents.

`manage_campaign` accepts the existing `audiences` format or `providerAudiences` with ToneDen's documented `data_source_platform`, `data_source`, and targeting fields. The existing field takes precedence when both are present. Campaign archiving and report notification settings are optional. `manage_link` supports saved music-service routing, music identifiers for rescans, playable previews, and event details. Its expand action returns the complete template in `link.raw`, including service links, pixels, social settings, and affiliate codes.

Resource results include optional `raw` provider metadata. Campaign insight intervals preserve audience-level statistics in `raw`; normalized statistics read each interval's aggregate `total` object. User-list contacts and offline conversions support external IDs, and conversions also accept location matching fields. User-list access may require approval from ToneDen support.

See [the API specification](docs/SPEC.md) and [ToneDen's official reference](https://developers.toneden.io/reference) for endpoint coverage and limitations.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
