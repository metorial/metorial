# <img src="logo.png" height="20"> Autobound

Generate personalized sales emails, sequences, call scripts, LinkedIn connection requests, SMS messages, and custom content. Retrieve company and contact buying signals, discover available signal types and subtypes, inspect the authenticated Signal API account, and import contacts with custom campaign fields into AI Studio.

Content tools use the Autobound Content API key. Signal tools use a separate key from [the Signal API portal](https://signalapi.autobound.ai). Choose Signal API Key for signal-only connections, or provide the optional Signal API key alongside the Content API key to use both API families.

The legacy `generate_insights` tool remains available with its existing inputs and output. Autobound [announces retirement on October 30, 2026](https://autobound-api.readme.io/changelog/generate-insights-api-retires-move-to-the-signal-api); migrate to `enrich_contact` or `enrich_company` for structured signal data. These return raw signals rather than seller-ranked insight text.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
