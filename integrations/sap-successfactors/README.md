# SAP SuccessFactors

Query authorized SAP SuccessFactors OData V2 records, discover company-specific API metadata, validate the current bearer token, and perform supported scalar insert or merge operations. Includes employee, job, organization, recruiting, compensation, time-off, performance, goal and succession queries when the company exposes their entity sets.

Connect with a registered OAuth SAML bearer client and its matching RSA certificate/private key, or supply an existing OAuth/OIDC bearer token. Use the company’s published HTTPS API server origin and sign-in company ID. SAML tokens renew through a freshly signed assertion; manually supplied tokens require reconnection when they expire. Basic authentication, certificate-server/mTLS authentication, custom proxy hosts, OData V4 and separate Learning APIs are outside this connection’s supported modes.

Call `get_current_context` to validate the token. This SAP endpoint returns token validity and expiry, not a user or company identity. The configured company ID is clearly labeled and is not asserted as a verified token claim. Call `get_api_metadata` to discover exact entity names, keys, field types, navigation names and advertised operations, and download the company’s XML metadata. Metadata availability does not establish data permissions, module licensing or target-population access.

Existing tools retain their keys. Entity sets vary between companies: in particular, legacy `EmployeeTimeAccount`, `GoalPlanTemplate` and `SuccessionNominee` names are used only if present in runtime metadata. If absent, inspect the API dictionary and use `query_odata_entity` with an explicitly selected supported entity. The integration does not silently reinterpret them as other APIs or promise calculated time-account balances.

Queries return one page and its exact `nextLink` when SAP supplies one. Pass that URL as `nextPage` on the same tool and entity, without `skip`; optional query fields must match the original query. `top` supports 1–1000 records; SAP may return fewer. For job, compensation, organization and generic effective-dated queries, use `asOfDate` or a `fromDate`/`toDate` range. Without these parameters SAP normally selects records effective today. A `startDate` filter alone does not request historical time slices.

Writes require exact metadata keys and scalar fields with supported EDM types. Required writable fields cannot be null. Use decimal strings for `Edm.Decimal` and large `Edm.Int64` values. Decimal readbacks preserve the provider’s exact string and accept equivalent trailing zeroes without rounding. Dates accept calendar dates, ISO date-times or documented OData date values. Insert requires explicit key fields; merge first verifies the existing record and confirms the requested fields by reading it back. Nested/navigation writes, credential fields and automatic upsert are unsupported. No automatic write retry occurs. An ambiguous write error includes the entity and recoverable resource keys so the same resource can be checked before retrying.

Creating time off requires `workflowConfirmed: true`, valid dates and the company’s required fields and permissions. An omitted `externalCode` generates a recoverable UUID. The optional legacy numeric duration accepts positive whole days; fractional duration is unsupported by this tool. Use SAP’s documented EmployeeTime API with an exact decimal string and its required workflow confirmation for fractional days. Submission does not imply approval. SAP workflows, audit records and personnel history can persist after deletion; employee accounts generally cannot be deleted through the User API.

## Tools

`get_employee`, `search_employees`, `manage_employee`, `get_job_info`, `get_org_structure`, `search_job_requisitions`, `get_job_application`, `manage_time_off`, `get_time_accounts`, `get_performance_reviews`, `get_goals`, `get_compensation`, `get_succession_planning`, `query_odata_entity`, `get_current_context`, `get_api_metadata`.

No event triggers, payroll execution, onboarding, learning administration or recruitment lifecycle automation is provided.
