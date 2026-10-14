# Paradym

Issue, verify, and revoke verifiable credentials using SD-JWT VC, mDOC, and AnonCreds formats over OpenID4VC and DIDComm. Discover accessible projects, create and inspect credential and presentation templates, track exchange sessions, manage trusted issuers, and establish DIDComm connections.

Call `list_projects` first, then pass the chosen `projectId` to project-scoped tools. Existing connections can continue using their saved project ID. Paradym now calls projects wallets; its documented compatibility API continues to support the project endpoints used here.

Credential-template listing supports a single format with cursor pagination, or the first page of each format when no format is selected. `get_credential_template` and `get_presentation_template` return the complete definitions for inspection and reuse. API verification-data access depends on the project's retention setting; webhook-only access is the provider default.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
