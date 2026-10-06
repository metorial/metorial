# BambooHR

Manage visible employee records, employee tables, time off, timesheets, goals, training records, applicant tracking and files. The integration exposes 39 tools. Permissions, company configuration and licensed BambooHR features determine which resources and fields are available.

## Connect an account

Use OAuth or an API key and the company subdomain, such as `example` for `example.bamboohr.com`. API keys use HTTP Basic authentication; OAuth uses a bearer token. Refreshing OAuth requires the redirect URI saved at connection time. Reconnect older connections that lack this value, or older API-key connections that lack the explicit authentication mode. Prior OAuth connections retain their documented expiration state as the authentication-mode evidence; ambiguous stored credentials are refused. The authenticated company owns the connection; old duplicate company configuration is ignored.

`get_current_user` requests only the caller's first and last name through employee ID `0`. An integration account without an employee binding can return only ID `0`; use a selected visible employee ID for employee-specific work. Names and other fields omitted by permissions are not empty employee values.

## Tools

| Area | Tools |
| --- | --- |
| Identity and discovery | `get_current_user`, `list_resources` for employees, current reports and application statuses |
| Employees | `get_employee`, `get_employee_directory`, `create_employee`, `update_employee` |
| Employee tables | `get_table_data`, `upsert_table_row`, `delete_table_row` |
| Time off | `get_time_off_requests`, `create_time_off_request`, `update_time_off_request_status`, `get_whos_out`, `get_time_off_balances`, `get_time_off_types` |
| Time tracking | `get_timesheet_entries`, `clock_in_out`, `add_timesheet_entry` |
| Reports | `generate_custom_report`, `get_company_report` |
| Goals | `get_goals`, `create_goal`, `update_goal`, `add_goal_comment` |
| Training | `get_training_types`, `get_employee_training_records`, `add_training_record` |
| Benefits | `get_benefits_overview` reads company benefits and coverage levels, plus employee dependents when selected |
| Files | `list_files`, `upload_file`, `download_file`, `delete_file` |
| Applicant tracking | `get_job_listings`, `get_applications`, `get_application_details`, `update_application_status`, `add_application_comment` |
| Metadata | `get_account_fields`, `get_account_metadata` |

Employee discovery returns one cursor page. Directory sharing and field permissions can restrict visible records; the reported employee total is not a verified readable company headcount. Goals return at most 50 visible records. Applications use native page numbers and an explicit completion flag; the old `pageLimit` argument is unsupported.

Employee reads accept up to 400 exact field IDs, including documented dotted subfield IDs. Updates report only submitted fields whose values were verified by an exact readback. Employment-status table changes and employee photos are outside direct employee-field updates.

Table creation and updates use the current v1.1 endpoints. Updates report which submitted values were read back exactly; omitted or normalized fields remain unverified. Creation acknowledges the request without guessing a row ID. Use `get_table_data` to identify and verify the new row before further changes.

## Reports and downloads

Current saved reports discovered by `list_resources` use a separate ID namespace. Supply `reportSource=current` to read one JSON page with `page` and `pageSize`. The default `reportSource=legacy` preserves the documented deprecated saved-report API and its separate report IDs. Legacy report formats are JSON, CSV, PDF and XML. Ad-hoc reports also use BambooHR's documented deprecated report API. `onlyCurrent` selects the current value of historical fields; it does not limit results to active employees. Saved-report `lastChangedSince` is unsupported; use an ad-hoc report's change filter instead.

JSON reports return structured data. Other report formats and file downloads produce downloadable files. `download_file` checks the exact file ID in its selected employee or company folder first. Uploads accept literal UTF-8 text under 20 MB, not base64. Select a category that permits uploads. Files that do not permit deletion are refused; invisible metadata does not prove deletion.

## Mutation limits

A goal requires a title, due date and sharing that includes its owner. Updates preserve omitted optional goal fields through the documented v1.1 endpoint. Training cost amount and currency must be supplied together; zero is preserved. Hour entries are created without an existing entry ID. Historical clock-in timestamps need an IANA timezone; clock-out does not support notes.

Time-off approval may complete only the caller's workflow step and leave the request pending. Balance visibility can be partial, and discretionary policies can report zero. Who's-out results include holidays and may contain multiple occurrences for an employee. HR and ATS writes can retain history or trigger company workflows; verify the exact resource before retrying a request with uncertain completion.

No event subscriptions are provided.

## License

[FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE)
