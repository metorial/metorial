# Borneo integration

The integration exposes 24 registered tools for one Borneo API product. It uses the deployment-specific HTTPS API endpoint and a bearer token in `Authorization`. An optional `organisationId` selects an authorised organisation through `x-selected-organisation-id`; `get_current_user` discovers organisation membership. New connections store the endpoint with authentication. Parsed legacy configuration retains a previously stored `baseUrl`, which is used only when authentication has no endpoint.

| Workflow | Tools and actions | Vendor API families |
| --- | --- | --- |
| Identity and discovery | `get_current_user`, `list_accounts`, `list_connectors` | `/dashboard-users/current`, `/accounts`, `/connector` |
| Scanning | `create_and_schedule_scan`, `manage_scan`, `list_scan_iterations`, `get_scan_iteration`, `list_inspection_results` | `/scan`, `/scan/list`, `/scan/{id}`, PUT scan controls, `/scan-iteration`, `/insight/list` |
| Privacy records | `manage_data_breach`, `manage_processing_activity`, `manage_dpia`, `manage_recipient`, `manage_asset` | Breach, processing-activity, DPIA, recipient, discovered-recipient, and asset APIs |
| Organisation records | `manage_employee`, `manage_department`, `manage_headquarter`, `manage_domain`, `manage_dashboard_user` | Employee, department, headquarters, domain, and dashboard-user APIs |
| Classification and legal documents | `manage_infotype_category`, `manage_legal_document` | `/categories`, `/legal-document` |
| Files and statistics | `export_inventory`, `download_report`, processing-activity export, `get_resource_statistics` | `/resource/inventory/list/export`, `/dashboard-report`, `/processing-activities/list/export`, `/resource/data-stats` |

List requests use the vendor's POST routes and provider response collection keys. Page size, sorting, and continuation tokens are translated to the documented body or query positions. Existing `page` inputs use zero-based continuation traversal. Missing list data produces an explicit error; totals are emitted only when supplied by the provider. Entity responses retain provider fields and nulls. Lists also retain the provider response as `raw`. Known credentials are redacted from public results.

Existing input fields and types remain available. Legacy scan schedule values translate to `once` and `cron`. `resourceIds` becomes `resources.resourceIds`; inline inspection policy and scan-limit options are available. Breach title, date, and affected-subject fields map to the vendor's `shortDescription`, epoch-second dates, and `numberAffectedPeople`. Processing-activity descriptions map to `additionalInfo` and retention-policy text to `retentionPeriodComment`. DPIA risk levels map to their dimension's `baselineSeverity`. Export formats are lowercased for the provider. Dashboard-user organisation ID strings translate to numeric membership objects using only explicitly supplied documented roles; the optional `memberships` field supports different roles and departments for each organisation. Unsupported IDs, absent membership roles, and ambiguous membership inputs fail before any request. Unsupported legacy parameters receive an explicit validation error; they are not sent under guessed provider fields.

Inventory export retains the required `resources` array by also retrieving the selected page from the documented inventory list API. Its count and continuation token come from that actual list response. File outputs deliver the provider's actual URL, with current bearer authentication only for URLs inside the configured API endpoint. Signed external URLs are delivered intact; their credential parameters are redacted in ordinary results. Expiry metadata is absent from the vendor contract, so an expired link requires a fresh export.

No triggers or webhook registration are claimed. OAuth is not used; the supplied bearer token is not automatically renewed.

## Sources and deployment limits

- [Vendor-authored SDK and README](https://www.npmjs.com/package/@borneodata/borneo-client), version 3.19.4, marked deprecated by its publisher.
- [Generated REST serializers](https://cdn.jsdelivr.net/npm/@borneodata/borneo-client@3.19.4/dist-es/protocols/Aws_restJson1.js) and [model declarations](https://cdn.jsdelivr.net/npm/@borneodata/borneo-client@3.19.4/dist-types/models/models_0.d.ts), used as published API-contract evidence.
- Current API documentation is hosted by each customer deployment at `https://<your-stack>/docs/api`; no authenticated deployment documentation or live API was accessed.

This audit establishes compatibility with the published SDK contract, not verification of a current customer deployment. Live provider behaviour, bearer-token lifetime, and deployed download delivery remain unverified.
