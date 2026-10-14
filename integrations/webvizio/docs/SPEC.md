# Webvizio API integration

## Authentication

Use a personal access token from the Webhooks tab in Webvizio account settings. Requests use `Authorization: Bearer <token>` against `https://app.webvizio.com/api/v1`. The provider documents that generating a new personal access token invalidates the previous token. This integration uses the personal access token, with no account or project ID required at connection setup.

## Supported tools

| Resource | Tools | Selection |
| --- | --- | --- |
| Project | create_project, find_project, update_project, delete_project | projectId, uuid, or externalId; find_project also accepts name |
| Task | create_task, find_task, update_task, delete_task | Creation requires projectId, projectUuid, or projectExternalId; other operations require taskId or externalId |
| Comment | create_comment, find_comment, delete_comment | Creation requires taskId or taskExternalId; other operations require commentId or externalId |

Create Project requires a website URL. Create Task requires a task name. Create Comment accepts an HTML body. Resource selectors must be nonempty, and numeric IDs must be positive whole numbers. Multiple documented selectors may be supplied together.

Project mutations accept name and screenshotUrl; screenshotUrl maps to the API's screenshot field. Tasks support description, status (`Open`, `In progress`, `Done`, `Closed`), priority (`Low`, `Normal`, `High`), assignees, tags, file links, and time logs. dueDate maps to executeAt. Omitted fields are excluded from request bodies, while explicitly supplied empty descriptions and arrays are retained.

Task timeLogs entries accept optional id, user, date, and time. Include id to update an existing entry returned by find_task (as timeLogId); omit id to create a new entry. Time durations must be nonnegative whole minutes. Both create_task and update_task support this documented time-log behavior.

The existing REST requests use POST for create/find/update and DELETE with a JSON body for deletion. Project and task outputs expose their resource identifiers and documented metadata; comment outputs expose their parent task. API failures and invalid selectors produce actionable errors.

## Coverage limits

The documented incoming-webhook operations are covered by the existing eleven tools. No additional endpoint wrapper was justified by these docs. An account/profile endpoint and project/task list endpoint were not documented in the reviewed personal-access-token API; no endpoint was guessed. AI API keys, prompt generation, technical-log retrieval, and webhook subscriptions are outside this tool surface.

File and screenshot URLs returned in resource metadata remain metadata links. No new download or export operation is added. Verification is local build and static review only; no live provider requests, E2E tests, or evals were run for this refresh.

## Official sources

- [Incoming webhooks: request fields, selectors, methods, response fields, and time-log IDs](https://webvizio.com/help-center/incoming-webhooks/)
- [Webhooks: personal access token setup and authorization](https://webvizio.com/help-center/introducing-webhooks-automate-your-workflow/)
- [Outgoing webhooks: resource metadata reference](https://webvizio.com/help-center/outgoing-webhooks/)
