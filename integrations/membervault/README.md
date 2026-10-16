# <img src="logo.png" height="20"> MemberVault

List MemberVault products, grant or revoke product access, and permanently delete user accounts. Adding a user to a product creates their account when needed; use product ID `-1` to create an account without product access.

Connect with the API key from **Integrations → Other → Webhooks API** and your account subdomain. For `https://mybusiness.mvsite.app`, enter `mybusiness`.

Use `get_courses` for product discovery. The original `list_products` tool remains available with its existing behavior and is deprecated because its response mapping is undocumented. This does not indicate that MemberVault has retired an endpoint.

The integration covers all four endpoints in MemberVault's [official API documentation](https://intercom.help/membervault/en/articles/6869595-api-endpoints-advanced). Event subscriptions and a current-account identity endpoint are not documented in that API. MemberVault's manually configured Actions can call external webhooks separately.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
