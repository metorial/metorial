# Leiga integration specification

## Authentication

The `client_credentials` auth method exchanges a Client ID and Secret Key with `POST /authorize/access-permanent-token` and uses the returned token in the `accessToken` header. Credentials come from Leiga API settings. The provider example includes `expireIn: 2592000`; reconnect if the token expires or is revoked. This connection uses the permanent-token endpoint and does not implement the separate refresh-token flow.

## Tools

The integration exposes 37 tools for the following workflows:

- Project and member discovery: `list_projects`, `list_project_members`, `list_org_members`.
- Issue discovery and CRUD: `list_issue_types`, `get_issue_schema`, `get_issue`, `query_issues`, `create_issue`, `update_issue`, `delete_issue`.
- Subtasks: `list_subtasks`, `add_subtask`, `update_subtask`, `delete_subtask`.
- Issue links: `add_issue_relation`, `remove_issue_relation`.
- Sprints: `list_sprints`, `create_sprint`, `update_sprint`, `delete_sprint`.
- Epics: `list_epics`, `create_epic`, `update_epic`, `delete_epic`.
- Organization releases: `list_versions`, `create_version`, `update_version`, `delete_version`, `manage_version_lifecycle`.
- Comments: `list_comments`, `add_comment`, `update_comment`, `delete_comment`.
- Tags: `list_tags`, `create_tag`, `update_tag`, `delete_tag`.

All inputs use object schemas. Existing tool keys and field types remain available; new fields are additive or relax unnecessary project context on organization versions.

## Request and response behavior

Issue updates send `PATCH /issue/update` with `{ id, data }`; issue deletion sends `DELETE /issue/remove` with `{ id }`. Issue queries send `POST /issue/page`; `filters` contains documented body fields such as `summary`, `selectFields`, `dateFields`, `statusTypes`, `orderBy`, `sort`, and `showedCustomFieldCodes`. Issue reads map the nested `data` fields and `*VO` names while retaining the complete provider object in `raw`.

Adding one subtask uses `POST /issue/batch-add-subtask` with one entry in `datas`. Subtask updates send `{ id, data }`; deletion sends `{ issueId, subTaskId }`. The existing string `status` input accepts a numeric status ID. ISO dates are converted to the millisecond timestamps shown in provider examples.

Issue relations translate source/destination IDs into `issueId` and `linkedIssueId` and normalize relationship names to documented uppercase codes.

Sprint updates retain the current name when omitted because the provider requires it. Epics map the public `name` input into the dynamic `data.summary` field. Comments use `commentModule: issue`, `linkId`, and `commentId` for replies. Tags map `name` to `tagName`; the legacy color input remains accepted by the schema but produces an actionable validation error because the documented tag API does not define colors.

Epics, comments, organization members, issue queries, and organization versions expose the provider's page contents; paginated list tools accept page number and size. Versions are organization-wide, so legacy `projectId` is accepted without a provider filter. Version creation and updates require `ownerId` at invocation. The current name is retained when omitted on update. The existing `releaseDate` input maps to `planDate`; releasing a version sends `releasedDate`, defaulting to the current time.

HTTP failures and unsuccessful provider envelopes are reported as structured service errors, including provider error codes where available. Successful mutation envelopes with `data.success: false` cannot be reported as success.

## Official references

- [OpenAPI documentation entry point](https://guide.leiga.com/settings/openapi)
- [Personal API key setup](https://guide.leiga.com/personal/key)
- [Provider API reference](https://share.apidog.com/5a741107-c211-410f-880c-048d1917c984)
- [Issue schema](https://share.apidog.com/5a741107-c211-410f-880c-048d1917c984/api-3741834)
- [Subtask list](https://share.apidog.com/5a741107-c211-410f-880c-048d1917c984/api-3741848)
- [Update tag](https://share.apidog.com/5a741107-c211-410f-880c-048d1917c984/api-3741865)
