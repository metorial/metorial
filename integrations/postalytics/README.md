# Postalytics

Automate direct mail campaigns including personalized postcards, letters, and self-mailers to US and Canadian addresses. Create and manage mail templates with merge fields, conditional logic, and variable images. Build and manage contact lists with automatic CASS/NCOA address validation. Orchestrate smart send, triggered drip, and file-based campaigns with multi-touch flows. Send individual mail pieces or enroll contacts into multi-step sequences. Track mail delivery in real-time via USPS Intelligent Mail barcodes and monitor online responses through personalized URLs (pURLs) and QR codes. Manage suppression lists, create sub-accounts for multi-tenant use, and embed white-labeled campaign components into third-party applications.

## API capabilities

- Read the current account identity with `who_am_i`.
- Create campaigns from proofed templates with `create_campaign`.
- List and retrieve flows, then enroll or unenroll contacts.
- Create, inspect, or delete suppression lists and browse, add, or remove suppressed contacts.
- Create templates from HTML or provider-accessible front/back images.

Authentication uses an API key as the HTTP Basic username with an empty password.
Choose production or development when configuring the connection. Each API key is
limited to 3 requests per second or 180 requests per minute.

API array responses for campaign events and account integrations are preserved
inside `events.data` and `integrations.data`, respectively.

See the [official API documentation](https://docs.postalytics.com/).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
