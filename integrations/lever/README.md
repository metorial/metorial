# Lever

Work with opportunities, shared candidate contacts, job postings and the hiring pipeline in Lever. Read related activity, discover resource IDs and download opportunity files or resumes. Existing tools also support users, requisitions and individual interviews on externally managed panels.

| Workflow | Tools |
| --- | --- |
| Opportunities | `list_opportunities`, `get_opportunity`, `create_opportunity`, `update_opportunity` |
| Candidate contact and notes | `update_contact`, `add_note` |
| Postings | `list_postings`, `manage_posting` |
| Users | `list_users`, `manage_user` |
| Interview and requisition management | `manage_interview`, `manage_requisition` |
| Pipeline and activity discovery | `get_pipeline_metadata`, `get_opportunity_activity` |
| Exact resource reads | `get_resource`: posting, user, requisition, interview or panel |
| Additional discovery | `list_resources`: requisitions, panels or feedback templates |
| Downloads | `download_file`: one opportunity file or resume |

Use `list_users` to select the acting user required for opportunity, posting and interview creation or updates. Discover opportunities with `list_opportunities`, pipeline IDs with `get_pipeline_metadata`, and panel or requisition IDs with `list_resources`. Listing tools return one page; follow the cursor for that same resource type. A cursor cannot be shared across different activity or metadata collections.

Production and sandbox connections support OAuth or an API key. OAuth includes refresh access and requests twenty scopes covering the available tools. API keys use Basic authentication with an empty password. Historical API-key connections created with the previous Bearer behavior must reconnect. Lever documents no suitable authenticated-self endpoint, so `list_users` discovers authorized users without claiming to identify the connection owner.

Updates to users, requisitions and interviews preserve current writable fields and check a second read for changes. Nested requisition custom fields are merged, while supplied arrays replace their existing values. These checks cannot prevent changes after the final read. Opportunity changes execute sequentially and can partially complete. Contacts are shared across candidacies; changing one affects every associated opportunity.

Interview actions require the opportunity and acting-user IDs. They do not create panels or write panel timezones. Deleting the last interview can delete its panel. Existing interview conference details that cannot be preserved through the documented write format prevent replacement updates. Changing a user to the interviewer role removes that user’s followed profiles. Posting writes bypass Lever’s posting approval workflow. The legacy posting `salaryRange` input is retained but rejected because the authenticated Data API does not document that write; edit salary details in Lever.

File downloads use exact opportunity and file IDs. This integration does not upload files, submit applications, edit feedback forms, configure webhooks, manage approval chains, or expose payroll, EEO, diversity surveys or audit administration. EU data-center redirects and deployed file delivery have not been verified; authenticated HTTP redirects are rejected.

See the [supported API contracts](docs/SPEC.md), [Lever API documentation](https://hire.lever.co/developer/documentation) and [OAuth guide](https://hire.lever.co/developer/oauth).

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).
