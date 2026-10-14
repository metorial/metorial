# Whop

Manage Whop products, pricing plans, memberships, members, payments, refunds,
promo codes, checkout configurations, invoices, and user profiles. Discover
business accounts with `list_accounts`, inspect the signed-in OAuth identity
with `get_current_user`, and retrieve existing checkout links with `get_checkout`.

Use a company/account or app API key with the permissions required by each
operation. OAuth supports sign-in with PKCE and token refresh; its identity
scopes support `get_current_user`, while commerce endpoints require additional
permissions granted by Whop. Pass an account ID returned by `list_accounts` as
`companyId`, or set an optional company ID default in the connection.


## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
