# CodeREADr

Manage scanning services, app users and service permissions, barcode validation databases, scan records, data collection questions, and registered device names. Search database values and scans with pagination, discover scan upload batches, edit questions and their answer options, and check account API limits. Generate downloadable QR or PDF417 barcode images with `generate_barcode_file`.

Authenticate with a CodeREADr API key from your account settings. Current tools use the provider's POST API; API access, limits, and branded barcode options depend on your account plan. The deprecated `generate_barcode` tool preserves its original credential-bearing image URL for compatibility. Use `generate_barcode_file` to receive a downloadable image without returning the API key in a URL.

When updating a service, provide its current `symbologies` selection to retain custom barcode formats. CodeREADr resets that selection to its default when the parameter is omitted.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
