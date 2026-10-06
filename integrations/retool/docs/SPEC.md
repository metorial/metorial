# Retool API contract

Primary references: [current API reference](https://docs.retool.com/api), [official OpenAPI](https://docs.retool.com/api-spec), [token authentication](https://docs.retool.com/org-users/guides/retool-api/authentication), [Retool API resource setup](https://docs.retool.com/data-sources/guides/connect/retool-api), and [administration](https://docs.retool.com/org-users/quickstart).

The audited official specification identifies version **4.70.0**. Routes are relative to the selected Retool instance’s `/api/v2`. The docs-rendering server placeholder is not an account endpoint. Each Space has its own endpoint/token context, with the documented primary-admin exception. API access uses Bearer tokens and operation-specific scopes; organization scope availability and deployment version determine support. No token exchange, OAuth refresh or universal account/self endpoint is fabricated.

| Capability | Native contract |
| --- | --- |
| Users | GET/POST `/users`, GET/PATCH/DELETE `/users/{userId}`; DELETE disables. User attributes accept existing names and string/null values; POST/DELETE return updated metadata. |
| Groups | GET/POST `/groups`, GET/PATCH/DELETE `/groups/{groupId}`. Partial changes use JSON Patch. Membership POST sends `{members:[...]}`; DELETE removes one native member per request and returns HTTP 200 with the updated group. Exact group identity and member absence are checked. Sequential failures distinguish confirmed, uncertain and unattempted removals. |
| Apps | GET `/apps`, GET/DELETE `/apps/{appId}`. Current spec does not document POST `/apps` or PUT/PATCH `/apps/{appId}`; retained create/update tools refuse locally. |
| Folders | GET/POST `/folders`, GET/PATCH/DELETE `/folders/{folderId}`. Creation defaults the previously optional type to app. Updates use JSON Patch; deletion does not request recursive expansion. |
| Permissions | POST `/permissions/listObjects` with typed subject and required object_type; GET `/permissions/accessList/{objectType}/{objectId}` also accepts documented numeric app/folder IDs while preserving UUID/prefixed IDs. Numeric aliases apply to this read route only. POST grant/revoke retain their exact native identifier contracts. Group subject IDs are numeric. Revoke omits access_level and removes all direct access. Supported object types differ by route. Missing access-list categories make completeness unknown. |
| Resource/environment metadata | GET `/resources` and `/resources/{resourceId}`, GET `/environments`. Resource labels use display_name; environments use default. No configuration credentials are returned. |
| Workflows/runs | GET `/workflows`, GET `/workflows/{workflowId}`, GET `/workflow_run/{id}`. Run reads return a bare object with exact run/workflow identities. No execution or activation is added. |
| Spaces | GET/POST `/spaces`, GET/PUT/DELETE `/spaces/{spaceId}`. PUT requires both name and domain; partial inputs hydrate the omitted field from the exact current object. No atomic concurrency guarantee. |
| Context/configuration | GET `/organization/` yields real org ID/advanced settings; GET `/source_control/config` is projected to safe settings; GET `/access_tokens` yields safe credential metadata. No raw source-control credentials or new token writes. |

Users/apps/resources support native limit/next_token. Folders/workflows are locally sliced only after proving a complete native inventory. Other unparameterized lists require complete native metadata. No native export/download endpoint exists in the retained scope, so no invented file delivery or renewal is declared.

Legacy keys and input field types remain. Additive native access enums and exact-read tools are supported. Explicit compatibility exceptions preserve documented nullable outputs and remove false successes for unsupported writes/permission combinations. A malformed or mismatched write receipt reports uncertainty, not safe rollback. Rate limiting is native (300 points per 60 seconds, endpoint-dependent cost); no automatic write retry is performed.
