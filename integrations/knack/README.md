# Knack

Create, read, update, and delete records in Knack objects and views. Query records with filtering, sorting, and pagination, discover application structure, upload files and images, and download files stored in records.

## Connect

Use the Application ID and app-specific REST API key from Builder > Settings > API & Code. Supply the Application ID with your credentials for new connections. Existing connections keep using their saved Application ID until credentials include one.

User Token authentication supports view-based requests. Obtain a token by logging into your Knack app; tokens expire after 48 hours, or two weeks with Remember Me. Reconnect with a new token after expiry. API Key connections can access objects and public views; login-protected views require User Token authentication.

## Workflows

- Call `get_app_metadata` to discover object, field, scene, and view keys. Optional `objectKey` and `sceneKey` focus its summaries; `raw` retains complete metadata and relationship definitions.
- Use `get_records` with `page` and `rowsPerPage` (maximum 1,000), filters, and sorting. `advancedFilters` supports valueless and relative date rules. For a connected child view, provide its `parentPageSlug` and `parentRecordId`.
- Use `get_record`, `create_record`, `update_record`, and `delete_record` with an object key or scene/view pair. View permissions, form inputs, record rules, inline editing, and delete links apply. Wait at least one second between related mutations for calculations to complete.
- `create_record` and `update_record` preserve the complete provider payload in `record`. For view mutations this contains a nested record and submit key; the optional `returnedRecord` and `submitKey` expose those values directly.
- `upload_file` decodes base64 input into a binary multipart upload, then associates the returned asset with a record. Select `assetType: image` for an image field. Re-upload for every additional field or record; one asset may belong to only one field.
- `get_record_file` prepares a downloadable file using a file/image field's raw asset metadata. It supports Knack's documented stable public download URLs and returns asset metadata.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
