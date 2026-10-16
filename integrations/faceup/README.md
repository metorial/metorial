# FaceUp

Query FaceUp reporting statistics, retrieve report metadata, and synchronize the employee directory.

Create an API key in **Integrations → API keys** and copy the exact data hosting region from **Settings → Organization settings** (for example, `eu-west-1`).

- `get_report_statistics`: monthly report counts, documented filters, and optional additional metrics and breakdowns. Comparison metrics can be null; the `statistics` object retains the original values.
- `list_reports` and `get_report`: existing report metadata queries. Their GraphQL contracts are not described in FaceUp's public API guide, so availability must be confirmed for your account.
- `sync_employees`: create or update up to 1,000 employees per batch, identified by email. A batch succeeds or fails as a whole; omitted employees are unchanged. Set `status` to `Inactive` to deactivate an employee.

This integration does not register event subscriptions or expose messages, internal comments, or report edits.

See [API setup](https://support.faceup.com/api), [statistics documentation](https://support.faceup.com/integrating-faceup-statistics-with-power-bi), and [employee synchronization](https://support.faceup.com/api-employee-synchronization).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
