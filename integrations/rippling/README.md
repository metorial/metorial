# Rippling

Read workforce and company information through Rippling's v1 platform API. The integration retains 19 tools for employees, organizational reference data, app groups, leave, current-user identity, candidate onboarding and SAML metadata.

Use `platform_v1` with a v1 customer API token or a configured v1 partner OAuth app. The newer v2 REST API has different resources and permissions; selecting the retained `v2` setting fails before a request. This does not imply that either provider API has been retired.

Partner OAuth requires the app name from `https://app.rippling.com/apps/PLATFORM/{APPNAME}/authorize`. Configure that name in the OAuth connection input. Installation scopes are configured in the Rippling app listing, and customer administrators consent to that listing's scopes. The connection requests documented company and employee prerequisite scopes and fields needed by retained tools; it excludes unrelated OIDC and personal-contact scopes. The exact documented read permissions, group permissions, leave-processing permission and SAML metadata permission must be approved in the app listing. Optional returned fields depend on the app's granted access. Existing connections with additional grants can still return those fields.

Read tools validate provider response shapes and exact requested identities. Paginated lists return one page and its count; use `limit` and `offset` to request further pages. A page is not a total company count. `sendAllRoles` applies only when including terminated employees and can bypass app provisioning rules.

Group tools require a v1 partner OAuth app with Group Management enabled; customer API tokens cannot use them. Group member IDs are employee role IDs from `list_employees`. Updates replace the full membership list when supplied and read omitted fields from the exact group. Use the returned opaque `versionToken` for concurrency. The legacy numeric `version` remains supported only when it faithfully represents the provider token; opaque versions are not converted into invented numbers. Concurrency failures require a new read and are never retried automatically. Group changes can affect personnel access and membership.

Leave processing changes a pending request's personnel state and requires an administrator or manager. Candidate onboarding is available only to v1 partner OAuth applications, excludes customer API keys, and can initiate a new-hire workflow. Neither workflow has a documented automatic reversal in this integration. Verify provider state before retrying an uncertain change.

SAML metadata is delivered as a downloadable XML file for a SAML-enabled v1 partner OAuth app installation. Its `metadata` output now describes the filename and MIME type instead of containing XML. Rippling documents a 404 response when that app feature is unavailable.

Private verification requires a controlled company identity. Read scenarios compare tool results with independent provider reads. Group lifecycle writes require explicit isolated-company permission; leave decline requires explicit permission for a retained effect. Candidate onboarding is disabled in the private suite because the v1 documentation supplies no candidate readback or reversal endpoint. Missing local credentials do not disable the suite.

Official references: [v1 API](https://developer.rippling.com/documentation/base-api/), [partner installation](https://developer.rippling.com/documentation/developer-portal/v1-guides/installation), [group management](https://developer.rippling.com/documentation/developer-portal/v1-guides/group-management), [v2 quickstart](https://developer.rippling.com/documentation/rest-api/essentials/quickstart).
