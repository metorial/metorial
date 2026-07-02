# UniMicro Integration Spec

## Scope

This package implements a read-first UniMicro accounting and ERP integration.
It targets the concrete first-wave surface from
`docs/exec-plans/active/erp-integration-research/unimicro.md`:

- company context discovery
- customers and suppliers
- customer invoices and supplier invoices
- products, accounts, journal entries, and projects
- profit and loss, balance sheet, and trial balance report actions
- file downloads as Slate attachments

Destructive create/update/payment actions are intentionally excluded from this
initial version until live test coverage and exact action semantics are
validated with UniMicro.

## Authentication And Configuration

Authentication uses UniMicro OAuth 2.0 authorization code with refresh tokens.
The integration requests OpenID/profile, offline access, AppFramework, invoice,
accounting reporting, and accounting journal scopes.

Configuration fields:

- `environment`: `test`, `unimicro`, or `custom`
- `companyKey`: optional default CompanyKey for business API calls
- `customAppFrameworkUrl`, `customIdentityUrl`, `customFilesUrl`: required as
  applicable when using `custom`
- `defaultTop`: optional default list page size, capped at 50

Standard environment defaults:

- `test`: `https://test.unimicro.no/`,
  `https://test-login.unimicro.no/`, `https://test-files.unimicro.no/`
- `unimicro`: `https://app.unimicro.no/`,
  `https://login.unimicro.no/`, `https://files.unimicro.no/`

The OAuth callback stores resolved AppFramework, identity, and files URLs. The
client also respects the token `AppFramework` claim when present.

## Query And Pagination

List tools expose UniMicro's documented query parameters:

- `top`
- `skip`
- `filter`
- `select`
- `expand`

Structured filters are conservative and map to documented UniMicro filter
expressions. Advanced callers can provide raw `filter` for provider-specific
queries.

## Error Handling

Validation failures and upstream failures are converted to `ServiceError`
through shared Slates helpers. The HTTP client retries 408, 429, 5xx, and common
transient network failures before wrapping the final error.

## File Outputs

`download_file` resolves `StorageReference` from a file id when needed, calls
the UniMicro Files endpoint, and returns content via `createBase64Attachment`.
Tool output includes only metadata such as file name, MIME type, byte length,
storage reference, and attachment count.

## Verification

Package-local tests cover MCP-compatible top-level object input schemas and
read-only/destructive metadata. Private live E2E coverage lives in
`tests/integrations/unimicro/tools.e2e.ts`.
