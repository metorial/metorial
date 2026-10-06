# Gusto

Connect a Gusto company through production or demo OAuth. Call `get_current_context` to discover the exact authorized company UUID, token owner and granted API scopes; each OAuth grant targets one company. Gusto assigns scopes during application approval. Name and email are not invented when token introspection does not expose them.

The 20 tools cover company details, employees, contractors, payroll reads, pay schedules, company and employee benefits, earning types, time-off policies and activity, garnishments, locations, departments, jobs, compensation and form metadata. Use the exact resource IDs and current versions returned by read tools for updates. Collections expose documented page metadata when Gusto returns it.

Payroll calculation and submission, contractor payment creation and cancellation, job list/create/update, and form metadata endpoints require separately approved Embedded Payroll capabilities. The same OAuth authorization-code flow can connect an existing company migrated to Embedded Payroll. Gusto enforces the actual granted scopes; an app-integration connection does not gain Embedded capabilities automatically. This integration does not onboard or migrate companies, change tax configuration, create payment accounts or sign forms.

Payroll requests return asynchronous acceptance, not a completed calculation or payment. Check `get_payroll` and review its processing status before taking another action. Contractor cancellation succeeds only after Gusto acknowledges it and the exact payment is no longer readable. Writes are never automatically retried.

Employment changes must return the requested employee, effective date and supplied settings before they are reported as scheduled. Older OAuth connections that lack their original redirect URI must reconnect before refreshing their token.

Legacy tool keys and input types remain available. Unsupported payroll status filters and the undocumented `recurringChildSupport` field return actionable validation errors rather than silently changing meaning. Decimal strings remain exact; unsafe numeric monetary values are rejected. Form outputs contain metadata only.

Official references: [OAuth](https://docs.gusto.com/app-integrations/docs/oauth2), [token introspection](https://docs.gusto.com/app-integrations/reference/get-v1-token-info), [API versions](https://docs.gusto.com/app-integrations/docs/version-upgrade-guide), [Embedded authentication](https://docs.gusto.com/embedded-payroll/docs/authentication-and-authorization).

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
