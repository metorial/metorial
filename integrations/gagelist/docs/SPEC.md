# GageList integration

The integration manages gages, calibration records, manufacturer entries, custom field values, account settings, and downloadable record files.

## Authentication

Use the API client ID and client secret issued by GageList. The documented token exchange is `POST https://gagelist.net/api/token` with form fields `grant_type=password`, `client_id`, and `client_secret`. Subsequent calls use the returned bearer token with base URL `https://gagelist.net/GageList/api`.

Authentication validates that the provider returned a token. The profile name comes from the current site's `RequestedSite.Name`, with the enterprise name as a fallback. The public authentication article does not document refresh tokens or an expiry contract; reconnect if the provider rejects an expired token.

## Tools

- Gages: `create_gage`, `get_gage`, `update_gage`, `delete_gage`, `list_gages`. Updates include asset, measurement, location, calibration environment, and scheduling fields. Detail responses include linked file metadata.
- Calibrations: `create_calibration`, `get_calibration`, `update_calibration`, `delete_calibration`, `list_calibrations`, `generate_calibration_certificate`. Certificates are prepared as downloadable PDFs. Detail responses include linked file metadata.
- Files: `get_attachment` downloads a file by its ID from a gage or calibration detail; `delete_attachment` submits the documented delete request.
- Manufacturers: `list_manufacturers`, `create_manufacturer`, `update_manufacturer`, `delete_manufacturer`.
- Account: `get_account_status` returns current site/account context, roles, accessible sites, permissions, usage, and limits; `get_account_settings` and `update_account_settings` manage the existing configuration surface.
- Custom fields: `get_custom_fields`, `get_custom_field_values`, `update_custom_field_values`. Writes resolve exact field names to field IDs and submit the documented value-record array. Specify `recordType=Calibration` for calibration records; it defaults to `Gage`. Supply `valueIds` for existing value records; omitted IDs create new values. Non-string input values are serialized as JSON text for the provider's string `FieldValue`.

The list tools use the documented `start` and `record_number` paging parameters. Gage/calibration lists preserve their page counts and expose the provider's total only when supplied. Provider-reported failures and malformed record responses produce actionable errors.

## API limitations

The official custom-field-values read article repeats `/Account/Status`, despite describing custom-value request parameters and a custom-value response. The integration retains its existing read route until GageList confirms the correct endpoint. File-upload articles identify the routes but omit the upload request body and field name; upload tools are therefore unavailable. BI backup export is documented as a manual account workflow, with no published export API endpoint. No event or webhook capability is implemented.

## Official references

- [Developer API index](https://gagelist.com/developer-resources/)
- [Authentication](https://gagelist.com/developer-resources/authenticate-with-gagelist/)
- [Gage creation](https://gagelist.com/developer-resources/add-gage-record/) and [updates](https://gagelist.com/developer-resources/update-gage-record/)
- [Calibration creation](https://gagelist.com/developer-resources/add-calibration-record/) and [certificates](https://gagelist.com/developer-resources/generate-calibration-certificate/)
- [Download files](https://gagelist.com/developer-resources/get-attachment/) and [delete files](https://gagelist.com/developer-resources/delete-attachment/)
- [Custom value writes](https://gagelist.com/developer-resources/update-custom-field-values/)
