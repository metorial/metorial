# Lever API contracts

The integration uses Lever’s authenticated Data API v1. Its public surface is seventeen tools: fourteen existing keys and three additions for exact resource reads, discovery and downloadable files. There are no event or webhook registrations.

## Connection

Production uses `https://api.lever.co/v1`; sandbox uses `https://api.sandbox.lever.co/v1`. API keys authenticate as the Basic username with an empty password. OAuth uses the production `https://auth.lever.co` or sandbox `https://sandbox-lever.auth0.com` authorization and token endpoints, form token requests, Bearer access tokens and refresh-token persistence. Missing refresh state or invalid expiry fails explicitly. Production and sandbox auth output remain bound to their respective environments.

OAuth requests exactly twenty scope entries, including `offline_access`. A write scope includes that resource’s read permission. Unused confidential, webhook, upload, survey and administration scopes are excluded. Existing nonempty scope lists supplied by the authorization context are respected. Reauthorization may be required for historical applications whose scope sets differ.

There is no documented self-identity endpoint suitable for API-key and OAuth connections. The integration therefore exposes authorized-user discovery and exact user reads without inferring the connection owner. Lever’s OAuth guide describes EU data-center redirection, but no explicit regional host was verified in this refresh. Authenticated redirects are disabled; EU routing remains a limitation requiring provider guidance.

## Supported requests

| Tool | Native contract |
| --- | --- |
| `list_opportunities` | `GET /opportunities`, documented filters and one paginated result |
| `get_opportunity` | `GET /opportunities/:id`, comma-separated documented expansions |
| `create_opportunity` | `POST /opportunities`, acting-user query and native posting/stage/owner fields |
| `update_opportunity` | Stage/archive `PUT`, including `{reason:null}` for unarchive; tag/link/source add/remove `POST`; exact final read |
| `update_contact` | Exact contact `GET`; writable readback and `PUT` for supplied changes |
| `add_note` | Note `POST`, then hydrate the returned `noteId` with an exact note `GET` |
| `list_postings` | `GET /postings`, one page and documented category/state filters |
| `manage_posting` | Create or partial update `POST`; acting-user query, native content HTML, `onsite` workplace alias and resolved requisition codes |
| `list_users` | `GET /users`, email/deactivated filters and one page |
| `manage_user` | Create `POST`, replacement `PUT`, lifecycle `POST /users/:id/deactivate` or `/reactivate` |
| `manage_requisition` | Create `POST`, replacement `PUT`, delete `DELETE /requisitions/:id`; create requires name, code and headcount |
| `manage_interview` | Individual interview `POST`, `PUT` or `DELETE` under `/opportunities/:id/interviews`; externally managed panel required |
| `get_pipeline_metadata` | Separate stages/archive-reasons/sources/tags listings and paging state |
| `get_opportunity_activity` | Separate notes/feedback/interviews/offers/applications/resumes/files/referrals listings and paging state |
| `get_resource` | Exact posting/user/requisition read, or opportunity-scoped interview/panel read |
| `list_resources` | One page of requisitions, opportunity panels or feedback templates |
| `download_file` | Exact file/resume metadata and authenticated `GET` download endpoint under the same opportunity |

Pages accept integer limits from 1 to 100 and opaque offsets. Date filters and interview timestamps require valid ISO timestamps with a timezone. Missing or malformed resource data, contradictory changes, mismatched identities and reflected connection credentials fail explicitly rather than becoming an empty success. Upstream errors retain bounded HTTP status and fixed guidance without raw response bodies, request headers, candidate details or transport parents.

Replacement writes preserve documented writable fields and compare two exact reads before writing. Requisition compensation and custom-field objects preserve omitted nested keys; arrays supplied by the user replace the previous array. This is a best-effort readback guard rather than an atomic concurrency guarantee. Interview read-only interviewer fields are excluded from writes. Unrepresentable conference readback prevents an interview replacement.

Preserved legacy inputs that the Data API cannot accept fail with guidance: posting salary ranges, panel timezone through the individual interview endpoint, moving an interview to another panel, or resetting an existing posting’s workplace type to unspecified. The legacy reminder value `frequent` maps to native `frequently`. New acting-user, parent-opportunity and requisition-code fields remain optional in the serialized schemas, with operation-specific validation at invocation.

## Limits and verification

Interviews can trigger communications, and deleting a panel’s final interview deletes the panel. User role changes can remove followed profiles. Posting writes bypass approval workflows. Requisition writes require account-level API-management permission. Contact updates apply across every opportunity linked to that contact. Opportunity updates are sequential and can partially complete; failed writes may have completed upstream and require exact readback before retrying.

The private live suite stays active. Read scenarios compare independent native reads, including all added selectors and both download types. Mutation scenarios require explicit authorization for an isolated synthetic sandbox without concurrent changes or external automation and acceptance of retained recruiting history. Exact marker and complete-state checks gate retirement: owned opportunities are archived with a verified non-hired reason, postings closed, users deactivated and unassociated requisitions deleted. Unknown or changed state remains for manual inspection. Notes, contacts, tags and recruiting audit history may remain; the suite does not claim physical deletion or notification rollback.

The interview mutation scenario is specifically skipped because no complete independent notification observer and guard-panel retirement proof is configured. It does not mutate a pre-existing panel. No live provider request or personnel write was run during implementation. Local SDK probes, contract checks and collection establish static coverage; deployed downloads, OAuth consent and real permissions require a separately authorized live run.

Primary sources: [Lever Data API](https://hire.lever.co/developer/documentation), [OAuth integration guide](https://hire.lever.co/developer/oauth). Consult provider documentation for access restrictions and account settings.
