# Jira Service Management

Manage customer requests and Jira issues, discover service desks and request types, track SLAs, answer approvals, and maintain customer and organization membership.

## Authentication

OAuth 2.0 uses Atlassian's authorization-code flow with rotating refresh tokens and offline access. When several Jira sites are authorized, enter the intended Jira site URL during connection setup. API calls use the authorized site's cloud ID through Atlassian's API gateway.

API Token authentication accepts the Atlassian account email, unscoped API token, and site subdomain. Requests use HTTP Basic authentication against that site's HTTPS URL. Existing API-token connections without a saved site URL retain their previous gateway routing; reconnect to save the site URL.

OAuth requests only scopes used by these tools or profile/refresh handling: `read:servicedesk-request`, `write:servicedesk-request`, `manage:servicedesk-customer`, `read:jira-work`, `write:jira-work`, `read:jira-user`, `read:knowledgebase:jira-service-management`, `read:me`, and `offline_access`. Connections created before the user/knowledge-base scopes were added need fresh consent to use those endpoints.

## Available workflows

- Issues: `search_issues`, `get_issue`, `create_issue`, `update_issue`, and `delete_issue`. Updates support assignment, unassignment, and workflow transitions. Descriptions are converted from plain text to Atlassian Document Format.
- Requests: `create_customer_request`, `get_customer_request`, and `list_customer_requests`. Use `list_service_desks` followed by `list_request_types` with `includeFields` to discover creation inputs. Request fields are passed through unchanged.
- Comments and service operations: `add_comment`, `manage_approval`, `get_sla_information`, and `list_queues`. Comments support explicit public/internal visibility. Queues and SLA details require agent permissions.
- Customers: `manage_customer` creates accounts and lists/adds/removes service desk customers. `manage_organization` lists/gets/creates/deletes organizations and adds/removes members.
- Discovery: `list_projects`, `search_users`, and `get_current_user` expose identifiers needed for later operations.
- Knowledge base: `search_knowledge_base` searches articles linked to a service desk and returns the documented article view URL.

## Pagination and result semantics

Jira issue search uses the current enhanced JQL search endpoint, which does not return an exact match total. The legacy `total` field is optional and omitted; `returnedCount` is the actual number of issues in this response, never a total match count.

Use the returned `nextPageToken` and omit `startAt` to fetch the next page efficiently. Without a cursor, `startAt` retains its offset from the beginning of the search; with a cursor it skips relative to that cursor. Search stops once the requested result window is filled or Jira supplies no continuation. Each invocation is limited to 10 HTTP requests and a 30-second deadline, including offset skipping and in-flight requests. Deep offsets or restrictive provider page sizes can exceed that budget; use cursors, reduce the offset/page size, or narrow JQL. Budget failures return an actionable error without a misleading partial result. Jira's search consistency rules still apply.

Service desk `size` is the number of entries on the returned page. Existing `total` output names are retained for compatibility and described accordingly. Organization member reads use `start` and `limit`; a returned member page is not the entire organization. Request listing exposes `start`, `limit`, `size`, and `isLastPage` directly.

## Provider references

- [JSM REST API](https://developer.atlassian.com/cloud/jira/service-desk/rest/intro/)
- [Jira REST API v3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [OAuth 2.0](https://developer.atlassian.com/cloud/jira/service-desk/oauth-2-authorization-code-grants-3lo-for-apps/)
- [API-token authentication](https://developer.atlassian.com/cloud/jira/service-desk/basic-auth-for-rest-apis/)
