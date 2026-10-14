# Docmosis API Specification

Docmosis Cloud DWS4 generates documents from uploaded templates. Choose the US, EU, or AU processing region and authenticate with an environment API access key in the `accessKey` header or body parameter.

## Document Generation

`render_document` merges `templateData` with a template. Supported output formats include PDF, DOCX, ODT, RTF, TXT, and HTML; multiple formats produce a ZIP. Streamed responses become downloadable files. `storeTo` also supports email and configured S3 storage. S3 delivery requires Docmosis support to enable it. `renderTag` maps to the provider's `tags` parameter.

## Template Management

- `list_templates` discovers reusable template paths, including within a folder.
- `get_template_details` retrieves metadata. The legacy `uploadedTime` output carries the last-modified timestamp; the undocumented `createdTime` remains optional.
- `get_template_structure` returns elements under `structure.elements` and JSON sample data under `sampleData`.
- `upload_template` accepts base64 file bytes and optional path, description, development mode, and preservation of the previous template on validation failure.
- `download_template` retrieves the original uploaded file.
- `delete_template` deletes one or more paths.

## Operational Information

`get_environment_status` combines service availability, environment details, quotas, and render queue capacity. `get_render_tags` reports monthly usage for specified tags; at least one tag is required.

No event subscriptions are exposed by this integration.

## API Sources

- [DWS4 API overview](https://resources.docmosis.com/api-sdk/cloud-dws4-api)
- [DWS4 Web Services Guide, August 2026](https://resources.docmosis.com/Documentation/Cloud/DWS4/Cloud-Web-Services-Guide-DWS4.pdf), sections 2.4–2.10 and 2.19–2.24.
