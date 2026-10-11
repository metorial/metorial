# <img src="logo.png" height="20"> Resend

Send, receive, and manage emails programmatically. Send transactional and marketing emails with HTML, plain text, templates, attachments, scheduling, and batch sending. Manage sent and received email metadata, including downloadable attachments and original received messages. Manage sending domains with DNS verification (DKIM, SPF, DMARC) and open/click tracking. Create and organize contacts with contact properties, segments, and topic-based subscription preferences. Send broadcast campaigns immediately or on a schedule with automatic unsubscribe handling, and cancel scheduled or queued broadcasts. Manage the suppression list of addresses Resend will not deliver to. Create, publish, duplicate, and manage reusable email templates. Manage automations, events, API keys, webhook endpoints, and account logs for real-time email, contact, and domain event visibility.

## Authentication

Connect using an API key or OAuth. OAuth requests `full_access` because the integration manages and reads resources beyond sending email.

For managed OAuth, pre-register a confidential client using [Resend client registration](https://resend.com/docs/api-reference/oauth/register), with `token_endpoint_auth_method: "client_secret_basic"`, `authorization_code` and `refresh_token` grants, and the exact HTTPS callback URLs for each deployment. Set `scope` to `full_access` explicitly and securely store the returned client ID and one-time client secret. This integration uses mandatory S256 PKCE alongside HTTP Basic client authentication. Registration and deployment credential configuration must be completed separately.

Resend returns bearer access tokens, not API keys. Access tokens expire after 15 minutes, and refresh tokens rotate on every refresh with a renewed 60-day lifetime. The host must serialize refreshes for each grant and atomically persist the returned token pair; replaying an older refresh token can revoke the grant. See the [OAuth client guide](https://resend.com/docs/guides/building-a-resend-oauth-client) and [token reference](https://resend.com/docs/api-reference/oauth/token).

Users can revoke access in Resend Team settings. Operators can also [revoke the refresh token](https://resend.com/docs/api-reference/oauth/revoke) with client authentication, which revokes its grant. Automatic disconnect revocation is not implemented.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
