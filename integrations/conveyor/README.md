# Conveyor

Manage Trust Center documents, folders, access requests and authorizations. Discover customer connections, interactions, product lines and curated Q&A; search knowledge and maintain answers, tags and curators. Submit and update questionnaires, inspect extracted questions and reviewed answers, ask security questions, and list one-off questions and RFP projects.

Create an API key in **Settings → Integrations → Add Integration → Conveyor API**, selecting the read/write permissions needed for your workflows. The key is sent as `X-API-KEY` to `https://api.conveyor.com/api/v2`.

File uploads accept actual base64-encoded content and a filename. Document uploads are limited to 100 MB. Questionnaire submissions also support Salesforce content version references. Provider defaults apply when optional parameters are omitted; paginated tools accept `page` and `perPage`.

See [the capability reference](docs/SPEC.md) and [Conveyor's API documentation](https://docs.conveyor.com/reference/api-token).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
