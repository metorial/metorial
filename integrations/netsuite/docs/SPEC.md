# NetSuite integration specification

This integration exposes ten account-bound SuiteTalk REST tools. Availability depends on the account's enabled features, integration record, selected role, record permissions and native API operations. Metadata discovery describes that access; it does not identify the authenticated person or enumerate their roles.

## Authentication and account binding

OAuth 2.0 authorization code authentication requests only `rest_webservices`, sends S256 PKCE, and exchanges and renews tokens at the original account's SuiteTalk endpoint. The confidential-client flow expects the documented bearer token with a 3600-second lifetime. A previously issued refresh token is preserved when renewal omits a replacement. Expired or missing refresh credentials require reauthorization.

TBA signs the exact request URL and query with OAuth 1.0 HMAC-SHA256. The account ID is normalized separately for the realm (`12345_SB1`) and hostname (`12345-sb1`). New authentication stores that account with its credentials. Historical state without an account ID can use its validated saved account setting; an authenticated account takes precedence over that setting. Missing authentication method or invalid account/credential state requires reconnection.

Oracle blocks new TBA integrations starting in 2027.1 and tentatively plans to end existing TBA support in 2028.2. Existing TBA works under the current documented contract. New OAuth authorization code integrations will require PKCE in 2027.1; this integration already sends it. Sandbox access tokens must be generated for that sandbox and recreated after a sandbox refresh when required.

Sources: [account IDs](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1498754928.html), [OAuth authorization](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158081944642.html), [token exchange](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158081952044.html), [renewal](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_158082518856.html), [TBA signatures](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1534941088.html), [TBA migration](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0525020842.html), [sandbox token behavior](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4254801119.html).

## Tools and native behavior

| Tool | Native operation and result |
| --- | --- |
| `list_record_types` | GET `record/v1/metadata-catalog`; returns the native type names exposed to the current role. |
| `get_record_metadata` | GET `record/v1/metadata-catalog/{type}` with `application/swagger+json`; returns native operation and field metadata. |
| `get_record` | GET `record/v1/{type}/{id}`; preserves native nulls, numeric strings and nested data, with optional fields and sub-resource expansion. |
| `list_records` | GET `record/v1/{type}`; native body-field filter and a single validated page of IDs and links. |
| `query_suiteql` | POST `query/v1/suiteql`, body `{q}`, `Prefer: transient`; returns a single native query page. |
| `create_record` | POST `record/v1/{type}`; documented 204 plus an account/type-bound Location identifies the new record. |
| `update_record` | PATCH `record/v1/{type}/{id}`; documented 204 confirms the native update. |
| `upsert_record` | PUT `record/v1/{type}/eid:{externalId}`; documented 204, with a valid Location or exact external-ID readback to resolve the internal ID. |
| `delete_record` | DELETE `record/v1/{type}/{id}`; documented 204 confirms native deletion. |
| `transform_record` | POST `record/v1/{sourceType}/{id}/!transform/{targetType}`; documented 204 plus target-bound Location identifies the new record. |

All nine historical tool keys and input/output field types remain. Bare external IDs and `eid:<value>` are supported for upsert; the path does not accept a field-script-ID component. External IDs used in paths accept native letters, numbers, underscores and hyphens. Pipe-containing IDs need an appropriate native query instead. Internal IDs remain strings without numeric rounding.

The historical `list_records.fields` input remains in the schema, but a nonempty value is refused before dispatch because native collection reads return IDs and links. Use `get_record.fields` or SuiteQL to select values. Page limit is an integer from 1 to 1000, offset is nonnegative and divisible by limit, and native `count`, `offset`, `totalResults` and `hasMore` must be present and consistent. Missing pagination metadata is an error. NetSuite's page/result limits depend on the endpoint and account features; the integration does not claim unlimited enumeration.

SuiteQL supports the existing query-string contract. Queries need a deterministic sort for stable pagination and are subject to native permissions and the documented result ceiling. Additional native features such as bound parameters are not exposed by this tool contract.

Sources: [REST URL schema](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1546938065.html), [metadata catalog](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1540810174.html), [collection reads](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1540810951.html), [collection filtering](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1545222128.html), [paging limits](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156414087576.html), [external IDs](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156334828635.html), [upsert](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_156335203191.html), [SuiteQL](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157909186990.html).

## Effects and uncertainty

Native role permissions and supported transformations determine which writes are permitted. PATCH preserves omitted body fields, while native null and sublist semantics need special care. Scripts, workflows, notifications, dependencies and accounting effects may run on any record write. Creation, upsert or transformation can succeed before a missing or invalid receipt is detected; that failure requires reconciliation before retrying. There is no automatic retry, transaction rollback or invented compensation.

The private suite remains active for metadata and explicitly authorized read-only record/query fixtures. Its five write scenarios refuse before any effect because the suite cannot prove complete controlled financial, script, workflow, notification and dependency state or a safe cleanup path. No live acceptance or accounting cleanup is claimed.

Sources: [create receipts](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1545141395.html), [update behavior](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1545142173.html), [deletion](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1545142287.html), [transformations](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_157901123882.html), [role prerequisites](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/article_5085602973.html).

This tool set does not expose File Cabinet transfers, RESTlets, record actions, asynchronous jobs or trigger registration. Native errors retain safe HTTP status and error-code metadata; credential-reflected or malformed responses require explicit reconciliation or reauthorization.
