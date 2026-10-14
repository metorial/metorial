# Pipeline CRM specification

Pipeline CRM is a sales CRM for deals, people, companies, notes, and calendar tasks and events.

## Authentication

Connect with an API token from your profile's API tokens page, or with the existing API Key and App Key method. API tokens do not require an app key. A read-only token supports retrieval and discovery; writing tools require a read-write token. API-token availability depends on the account rollout.

Requests use `Authorization: Bearer <credential>`. Legacy API-key connections also send the `app-key` header. The API base URL is `https://api.pipelinecrm.com/api/v3/`.

## Available workflows

- Create, retrieve, search, update, and delete deals, people, and companies.
- Add notes, list notes for CRM records, retrieve or edit existing notes, and delete notes.
- Create, list, update, and delete calendar tasks and events; complete or reopen tasks.
- Discover account users, deal stages, event categories, lead sources, and custom field labels.
- Read and write custom field values, and retrieve the authenticated user's identity.

List tools return one page at a time with total counts and page counts. Metadata discovery tools collect every page. Configured loss reason names are resolved to IDs when updating a deal; a loss reason ID can also be supplied directly.

## Official reference

[Pipeline CRM API documentation](https://app.pipelinecrm.com/api/docs) and [OpenAPI specification](https://app.pipelinecrm.com/openapi.json).

Provider requests and account-specific behavior require live verification. No event subscriptions are configured by this integration.
