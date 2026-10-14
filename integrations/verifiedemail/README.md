# <img src="logo.svg" height="20"> VerifiedEmail

Verify email addresses, check verification credits, manage email lists, and retrieve downloadable verification results.

Create an API key at [app.verified.email/apikeys](https://app.verified.email/apikeys) with permissions for the operations you need. The integration uses bearer authentication against the [VerifiedEmail API](https://developer.verified.email/).

For bulk verification, create a list, start verification, and poll `get_email_list`. Request an export with `request_results_download`, then call `get_results_download` until the file is ready. List discovery accepts `page` or `offset`, with up to 10 lists per request.

Verification results expose the provider's result codes, score, role, alias, and available domain flags. Provider-dependent legacy fields remain optional; missing values are not inferred. Credit responses expose pay-as-you-go credits and automatic verification capacity.

The existing webhook and inline list-results tools remain available for compatibility, but their routes and payloads are not detailed in the current public API reference. Their behavior has not been verified against a live account. The API also does not document the legacy writable list `name` field; it is still sent for compatibility.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
