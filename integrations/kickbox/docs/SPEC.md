# Kickbox Integration

Kickbox verifies email deliverability and returns quality scores, address attributes, and typo suggestions.

## Authentication

Provide an API key from API Settings in the Kickbox dashboard. Requests use the `apikey` query parameter on `https://api.kickbox.com/v2`.

Sandbox keys begin with `test_` and produce mock verification results. The optional sandbox setting requires a Sandbox key and prevents verification calls with a live key. Changing the setting does not convert a live key into a Sandbox key.

## Tools

- `verify_email`: Verify one address and return deliverability, reason, Sendex score, role/free/disposable/accept-all flags, and typo suggestions. Optional response metadata includes remaining credits and API processing time.
- `create_batch_verification`: Submit email addresses as CSV and return a batch job ID. Supply an optional filename to name the job.
- `get_batch_verification_status`: Read a batch job's current status and provider details. Metadata can vary by processing state. Completed results are available as a downloadable CSV when Kickbox returns a download URL.
- `get_credit_balance`: Read the current credit balance details before verification or batch submission.

## API References

The official [PHP SDK](https://github.com/kickboxio/kickbox-php/blob/main/lib/Kickbox/Api/Kickbox.php) defines single verification, batch creation, batch status, and credit balance endpoints. Its [README](https://github.com/kickboxio/kickbox-php) documents verification fields, credit and processing-time response headers, and Sandbox keys.

The [API documentation](https://docs.kickbox.com/docs/using-the-api) is the primary reference for current limits and response details.
