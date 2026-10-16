# Page X

Submit leads to PageXCRM from websites, advertising platforms and other applications. Include contact details, a source platform, an optional external customer identifier, and custom details such as company or country.

Connect with a PageXCRM API key from [Integrations > API](https://www.pagexcrm.com/plugins/api) and a subscribed RapidAPI key. The optional configured customer identifier supplies a default for lead submissions; it is not an authentication requirement.

The `create_lead` tool keeps its existing name and email inputs. Its optional `more` object carries custom lead details; `country` is sent as `more.country`. A confirmed provider success returns `success: true` and the full response with echoed API credentials redacted. If completion cannot be confirmed, check PageXCRM before submitting the same lead again.

See the [provider API documentation](https://rapidapi.com/thunderhurt/api/pagexcrm) and [request mapping](./docs/SPEC.md). The published API inventory exposes lead submission; no documented account-identity endpoint is available.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
