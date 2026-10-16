# <img src="logo.png" height="20"> Kraken.io

Optimize images and PDFs from public URLs with lossy or lossless compression,
custom quality, resizing, conversion, metadata preservation, and auto-orientation.
Generate up to ten responsive image variants, including square thumbnails and
custom crops. Store results in Amazon S3 or prepare completed files for download.
Query the current account's plan, active status, and byte quotas.

`optimize_image` and `generate_image_sets` wait for results by default. Supply a
callback URL to receive a request ID immediately and have Kraken.io POST the
results to your application. Files hosted by Kraken.io expire after one hour;
download them promptly. If file delivery fails, completed optimization metadata
and the provider's original URL remain available with an explicit warning.

See [API coverage and provider documentation](docs/SPEC.md) for options and limits.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
