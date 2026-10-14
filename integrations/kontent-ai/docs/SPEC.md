# Kontent.ai Integration Specification

This integration uses the [Kontent.ai Management API v2](https://kontent.ai/learn/docs/apis/management-api-v2) to manage content and localized variants in a selected environment.

## Authentication and environment selection

Requests use a Management API key or personal API key in the `Authorization: Bearer <API_KEY>` header. Keys are managed in Kontent.ai project settings and have resource-specific permissions. This is API-key authentication; no OAuth refresh flow is required.

Each tool accepts an optional `environmentId`, taken from Kontent.ai project settings. Existing connections may continue to use their stored environment ID as a default. A missing ID fails with guidance to supply it. `get_environment` verifies the selected environment and returns its ID, project name, environment name, and production status. The Management API environment-information endpoint requires the ID; it does not discover all authorized environments. Subscription-level project/environment discovery requires a separate Subscription API credential and is outside this integration.

Base URL: `https://manage.kontent.ai/v2/projects/{environmentId}`.

## Supported tools

- Content item metadata: `list_content_items`, `get_content_item`, `create_content_item`, `delete_content_item`. Creating metadata does not set localized content; follow creation with `upsert_language_variant`.
- Localized content: `get_language_variant`, `upsert_language_variant`, `delete_language_variant`. Retrieve the latest variant, update selected elements, or delete one localization. The latest variant is the draft when both draft and published versions exist. Deactivated languages cannot be retrieved. Deleting the last variant also deletes the parent item.
- Publishing and workflow: `manage_workflow`, `list_workflows`. Supported actions are `publish`, `unpublish`, `create_new_version`, `change_step`, `cancel_scheduled_publish`, and `cancel_scheduled_unpublish`. Use ISO 8601 timestamps with timezone offsets for scheduled publishing/unpublishing. Workflow changes use `workflow_identifier` and `step_identifier` at the `change-workflow` endpoint; the current workflow is read from the variant unless `workflowId` is supplied. Provider permissions and transition restrictions apply.
- Content model: `list_content_types`, `get_content_type`, `list_taxonomy_groups`.
- Asset metadata: `list_assets`, `get_asset`, `update_asset`, `delete_asset`. Asset URLs are returned as metadata. This integration does not upload or download asset files.
- Environment settings: `get_environment`, `list_languages`, `list_collections`. Language listing returns one page and an optional continuation token.

## Content elements

Element codenames must exist in the item's content type. Values retain the provider representation: strings, numbers, reference arrays, taxonomy references, and rich text HTML. Optional `components` carries component objects referenced by rich text. URL slug elements require `mode: "custom"` when setting an explicit slug. The `get_language_variant` output retains additional provider element fields, including components and slug mode.

## Pagination and errors

List tools with continuation-token inputs send them using the `x-continuation` request header. Responses expose the provider's next-page continuation token when available. HTTP failures and unsupported input combinations return clear service errors. Missing workflow-step IDs and invalid scheduling timestamps fail before a workflow request.

## Official references

- [Authentication](https://kontent.ai/learn/docs/apis/management-api-v2/authentication)
- [Environments](https://kontent.ai/learn/docs/apis/management-api-v2/environments)
- [Language variants](https://www.postman.com/kontent-ai/kontent-ai-apis/folder/xwktown/language-variants)
- [Change variant workflow](https://www.postman.com/kontent-ai/kontent-ai-apis/request/p1tg19q/change-the-workflow-of-a-language-variant)
- [Publishing](https://kontent.ai/learn/docs/apis/management-api-v2/publishing)
- [Workflows](https://kontent.ai/learn/docs/apis/management-api-v2/workflows)
- [Languages](https://kontent.ai/learn/docs/apis/management-api-v2/languages)
- [Elements in variants and assets](https://kontent.ai/learn/docs/apis/management-api-v2/elements-in-variants-and-assets)
- [Assets](https://kontent.ai/learn/docs/apis/management-api-v2/assets)
- [Collections](https://kontent.ai/learn/docs/apis/management-api-v2/collections)
