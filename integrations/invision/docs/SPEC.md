# InVision Integration

## Availability

InVision discontinued its design products, including Prototype and DSM, effective December 31, 2024. This package retains its historical DSM and Enterprise SCIM tools for compatibility. Retaining a route does not establish current service availability. No authenticated provider operation has been verified.

Official retirement context: https://miro.com/blog/future-miro-freehand/.
The former InVision announcement and support/API documentation could not be accessed during this refresh:
https://www.invisionapp.com/inside-design/invision-design-collaboration-services-shutdown/ and https://support.invisionapp.com/.

## Authentication and Configuration

- `dsm_api_key`: DSM API authentication key. Use this connection for the DSM tools.
- `scim_bearer_token`: Enterprise SCIM provisioning bearer token. Use this connection for the SCIM tools.
- Each tool accepts its historical `dsmExportBaseUrl` or `scimBaseUrl` string. URLs must use HTTPS and omit embedded credentials, queries, and fragments.
- Optional `designSystemId` configuration is retained for saved-contract compatibility; existing tools use the supplied export URL.

Microsoft's official InVision provisioning guide documents Enterprise accounts with SSO enabled, the provisioning token and SCIM URL with `/scim/v2` appended, username filtering, and the supported `userName`, `active`, work-email, given-name, and family-name attributes:
https://learn.microsoft.com/en-us/entra/identity/saas-apps/invision-provisioning-tutorial.

## Tools

- `get_design_tokens`: historical `style-data.json` route, preserving `lookup` and `list` formats and structured token output.
- `get_design_token_styles`: historical `_style-params.<format>` route, preserving all seven format enum values and delivering an authenticated downloadable style file. The existing required `styleContent` string preserves the provider response verbatim for text or JSON-stringifies non-string responses; output also includes format, filename, and MIME type. Provider retrieval must succeed before a downloadable result is prepared.
- `list_scim_users`: SCIM `GET /Users`, optional username filter, 1-based integer start index, and non-negative integer count. Preserves provider pagination metadata, including a metadata-only count-zero query.
- `get_scim_user`: SCIM `GET /Users/{id}`.
- `provision_scim_user`: SCIM `POST /Users` with the core User schema, username, name, work email, and active flag.
- `update_scim_user`: SCIM `PATCH /Users/{id}` with PatchOp operations targeting only supplied fields. Email updates read the current user to choose filtered replacement of an existing work email or addition of a missing work email while preserving unrelated entries. Empty updates are rejected. Every successful PATCH is followed by a read so profile output remains complete even when the PATCH body is partial.
- `deprovision_scim_user`: SCIM PATCH setting `active` to false, or the existing explicit permanent-delete option using DELETE.

The PATCH correction follows the documented Microsoft Entra provisioning protocol used by InVision, which requires PATCH for updates, and RFC 7644 partial-modification semantics. InVision-specific endpoint acceptance remains unverified:
https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups and https://datatracker.ietf.org/doc/html/rfc7644.

No identity endpoint or new tool was fabricated from the SCIM standard. Provider documentation access is insufficient to establish support for optional SCIM discovery, identity, or group endpoints. No trigger or normalized-chat behavior is included.
