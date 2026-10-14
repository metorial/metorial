# LeadBoxer

Identify website visitors and enrich company and contact data. Discover accessible datasets, retrieve and paginate leads and sessions, inspect session events, look up IP addresses and company domains, enrich work emails, track server-side events, and manage lead tags.

Connect with a LeadBoxer API key. You can also save the email address of the account that owns the key; dataset discovery and lead details require this account email. Call `list_datasets` to choose a dataset for subsequent calls. Existing connections retain their saved dataset as a fallback.

Lead retrieval uses a 30-day period and a limit of 50 by default. Pagination tokens for leads and sessions expire after 10 minutes. Enrichment calls consume provider credits; email enrichment costs 50 credits when a match is found.

See the [official API reference](https://developers.leadboxer.com/reference/authentication) for credentials, endpoint requirements, and credit limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
