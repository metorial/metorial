# <img src="logo.svg" height="20"> MX Technologies

Connect financial institutions, manage users and members, aggregate accounts and transactions, retrieve investment holdings, and initiate account verification, owner identification, balance checks, and extended history. Discover login fields and MFA prompts to reconnect members, or generate a Connect Widget URL. Fetch and list statement metadata, then download authenticated statement PDFs. Enhance off-platform transactions, browse categories and institutions, and list financial insights.

## Authentication

Use your MX client ID and API key from the Client Dashboard. Select the development environment (`https://int-api.mx.com`) or production (`https://api.mx.com`). This integration uses the MX Platform API v20111101 contract and Basic authentication. Connected financial institutions may use OAuth through MX Connect; the integration credentials themselves are API credentials.

## Workflow notes

- Asynchronous operations return the member state. Poll Read Member Status before reading the resulting accounts, account owners, account numbers, or statements.
- When a member is challenged, use List Member Challenges and pass the challenge GUIDs and answers to Resume MFA Challenge.
- Use Read Institution to discover credential GUIDs before creating a member; List Member Credentials discovers fields for an existing member.
- Fetch Statements initiates retrieval. After completion, List Statements discovers statement GUIDs, Read Statement returns metadata, and Download Statement PDF provides the document.
- Pagination returns one page; pass `page` and `recordsPerPage` to continue. Standard maximum page size is 1000; default categories and insights allow 100.
- Widget URLs expire after ten minutes or their first use. Request a fresh URL on each page load.

Microdeposit flows, the separate Reporting API, and webhook subscriptions are not exposed by this package.

## Documentation

See [the provider API reference](https://docs.mx.com/api-reference/platform-api/v20111101/reference/mx-platform-api) and the [package capability map](docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
