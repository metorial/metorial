# Truvera by Dock Labs

Issue, retrieve, delete, and verify W3C Verifiable Credentials. Manage issuer DIDs, organization profiles, credential schemas, and revocation registries; create and read proof requests; send encrypted DIDComm messages and read wallet responses. Discover the current user profile and credential design templates.

Create an API key in [Truvera Workspace](https://truvera.io/keys) and select the matching production or testnet environment. The integration uses `https://api.truvera.io` or `https://api-testnet.truvera.io` with bearer authentication. Testnet resources cannot be used in production.

DID exports provide an encrypted wallet JSON download. Persisted credential retrieval remains available for existing workflows, although the provider recommends cloud wallets for new implementations. The existing anchor and presentation-creation tools retain their legacy endpoints; availability on the current API has not been verified.

See [the API reference](https://docs.truvera.io/truvera-api) and [integration details](./docs/SPEC.md).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
