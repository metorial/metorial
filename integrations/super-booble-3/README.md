# <img src="logo.svg" height="20"> Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 3

Use one Google OAuth connection for Google Cloud infrastructure, analytics, storage, functions, speech, vision, address validation, and Firebase workflows.

## Included tools

Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 3 directly composes all 114 tools from these integrations without reimplementing their handlers:

- Google Compute Engine: 29 tools
- BigQuery: 28 tools
- Google Cloud Storage: 12 tools
- Google Cloud Functions: 10 tools
- Google Cloud Speech: 10 tools
- Google Cloud Vision: 11 tools
- Google Address Validation: 2 tools
- Firebase: 12 tools

The two source tools named `get_operation` are exposed as `functions_get_operation` and `speech_get_operation`. No source tools are omitted. Triggers and non-OAuth source authentication methods are intentionally not composed.

## Configuration

Project-scoped tools use the optional `projectId`. Compute Engine has independent zone and region defaults, while BigQuery, Cloud Functions, and Cloud Speech each have their own location setting. Firebase tools can additionally use a Realtime Database URL, Storage bucket, and Web API key.

## Authentication

The integration uses one Google OAuth method that requests the complete cloud project declaration: 14 scopes covering Google Cloud Platform, Compute Engine, BigQuery, Cloud Storage, Cloud Vision, Firebase Realtime Database, and basic account email/profile access for connection identity. The BigQuery scopes back planned tools and are requested now so the consent screen matches the verified project declaration.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
