# Basin Integration Specification

## Authentication

Use a Basin Account API Key from Account Settings → API Settings. Requests use `Authorization: Token YOUR_API_KEY` with the REST API at `https://usebasin.com/api/v1`. REST API access requires a Growth, Pro, or Agency plan. Form API Keys have access only to their form and cannot support account-wide management.

## Supported workflows

- Forms: list, retrieve, create, update, and delete endpoints. AJAX configuration maps to `use_ajax`; email notification subjects map to `notification_subject`. CAPTCHA choices `hcaptcha`, `recaptcha`, `turnstile`, and `none` map to the documented protection flags. Form submission URLs use the returned endpoint URL or form UUID.
- Submissions: list with status, query, order, date-range, and page filters; retrieve submitted fields and metadata; change spam, read, or trash state; delete; re-queue outbound webhooks.
- Projects: list, retrieve, create, rename, and delete projects used to organize forms.
- Domains: list account domains.
- Outbound webhooks: list, retrieve configuration and delivery failures, create, update, and delete. Webhook delivery can be re-fired for one or more submissions.

Existing inputs, tool keys, and output types are preserved. Resource IDs and pages must be positive whole numbers. Lists retain support for bare arrays and the existing `items` or resource-named envelopes. Invalid response structures and API failures return actionable errors.

## Limits

Form Studio fields, themes, Lead Agent tags and rules, and hosted site management are not exposed by these tools. Legacy Form.io form views are a separate resource and are not treated as Form Studio schemas. File attachment entries returned with a submission are metadata; this integration does not download or upload files. Notification recipients may need verification in Basin before receiving submissions. Account access and plan restrictions are enforced by Basin.

## Official references

- [API reference](https://docs.usebasin.com/developer-features/api-reference/)
- [OpenAPI specification](https://usebasin.com/api_docs/v1/swagger.yaml)
- [Authentication](https://docs.usebasin.com/developer-features/authentication/)
- [API access and plans](https://docs.usebasin.com/account-management/api-access/)
- [Webhook re-firing](https://docs.usebasin.com/integrations/webhooks/)
