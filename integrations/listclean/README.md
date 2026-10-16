# Listclean

Verify individual email addresses, submit batches of up to 3,000 addresses, inspect verification lists, download CSV results by quality category, and read account profile and credit balance.

## Tools

- `verify_email`: verify one address and read the provider verdict and remarks.
- `get_account`: read the account profile and fetch the credit balance separately.
- `verify_email_batch`: submit an asynchronous batch with an optional source filename.
- `list_verification_lists`: discover list IDs and processing states.
- `get_verification_list`: poll a list until its status is `COMPLETED`.
- `download_list_results`: download `clean`, `dirty`, or `unknown` CSV results separately.

The original `upload_bulk_list`, `get_bulk_list_status`, `list_bulk_lists`, and `download_bulk_results` remain available with their existing inputs and routes. Those `/bulk/*` routes are not described in the current public API reference and have not been verified against a live account. The batch tool accepts email addresses, not arbitrary CSV columns, and does not replace file uploads.

## Authentication

Generate an API token in Listclean and connect with the API Token method. Requests authenticate with the `X-Auth-Token` header.

## Limitations

The list API returns a total and cursor but does not document a next-page request parameter. CSV results are available by category; the documented endpoint has no combined `all` download. The current upload API documents chunk transfer without a starting sequence convention or a verified mapping between upload and list identifiers, so the existing file-upload workflow is preserved without inventing a replacement.

[Official API reference](https://api.listclean.xyz/) · [Published API schema](https://api.listclean.xyz/v1/spec.json)

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
