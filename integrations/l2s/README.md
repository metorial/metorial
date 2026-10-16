# L2S

Create, retrieve, and update shortened URLs with custom aliases, UTM parameters, tags, and titles. Retrieve user account settings.

Use an L2S API key from https://app.l2s.is/integrations. Requests use Bearer authentication against `https://api.l2s.is`.

The integration provides `shorten_url`, `get_url`, `update_url`, and `get_user_settings`. URL tools preserve the provider's returned link metadata instead of constructing a shortened URL from a guessed domain.

The published [shortening reference](https://docs.l2s.is/) and [URL details reference](https://docs.l2s.is/api-8021272) document creation and retrieval. Updating URLs and reading settings retain the existing API routes; those routes could not be independently confirmed in the accessible published reference.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
