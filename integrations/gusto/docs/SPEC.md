# Gusto capability scope

20 public tools preserve the existing 19 keys and add `get_current_context`. Production and demo OAuth use documented company-scoped grants, API version 2026-06-15, rotating refresh tokens and token introspection.

App integrations support the documented company/personnel/payroll reads and supported writes. Embedded-only legacy routes remain available to appropriately approved credentials; no company onboarding, migration, system-token creation, bank-account or tax-administration tools are added. Payroll operations report asynchronous acceptance. Form operations return metadata, not PDF content.

See the package README for compatibility limits and current official references.
