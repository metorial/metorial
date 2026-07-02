# <img src="https://cdn.fiken.no/logo-2026.png" height="20"> Fiken

Fiken is a Norwegian online accounting system for small businesses, covering
accounting, invoicing, purchases, sales, products, projects, and related
financial records.

This integration uses Fiken OAuth2 for third-party access. It can discover the
companies available to the authenticated user, read and create contacts, inspect
invoices and invoice drafts, create invoice drafts for review, manage products
and projects, and read purchases, sales, bookkeeping accounts, and account
balances.

## Authentication

Fiken third-party integrations must use OAuth2. The authorization flow uses
`https://fiken.no/oauth/authorize`, and token exchange/refresh calls use
`https://fiken.no/oauth/token` with HTTP Basic authentication from the OAuth app
client id and client secret.

Fiken may rotate refresh tokens during refresh. This integration preserves the
latest refresh token returned by Fiken.

## Configuration

Set `defaultCompanySlug` when most tool calls should target one Fiken company.
If it is not configured, company-scoped tools require `companySlug` input. Use
`list_companies` first when the user does not know the slug.

## Tools

- List and get accessible companies.
- List, get, and create contacts.
- List and get invoices.
- List, get, and create invoice drafts.
- List, get, and create products.
- List, get, and create projects.
- List and get purchases and sales.
- List and get bookkeeping accounts and account balances.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
