# Addressfinder

Verify and autocomplete addresses for Australia, New Zealand, and supported international locations. Retrieve address and location metadata, verify Australian and New Zealand addresses, and reverse geocode New Zealand coordinates. Search New Zealand points of interest with `poi_autocomplete`, then retrieve full details with `poi_metadata`. Verify email addresses and phone numbers, including optional format-only checks.

Connect with your API key and secret, or select OAuth2 Client Credentials and provide credentials from the Addressfinder Portal. Client credentials tokens are renewed before expiry; OAuth2 requires an enabled Business or Enterprise plan. The legacy OAuth2 connection method is retained for existing connections, but new connections must use the client credentials method because Addressfinder has no browser authorization flow.

Email and phone verification outputs omit nullable attributes that the provider did not evaluate or could not determine. Email `deliverability` exposes the provider's confidence level; passing an email format check alone does not establish mailbox deliverability.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
