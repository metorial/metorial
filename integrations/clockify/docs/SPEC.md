# Clockify integration

This integration uses the [Clockify v1 API](https://docs.clockify.me/) and Reports API.

## Connection and workspace discovery

Use an API key generated in Clockify Profile Settings. Requests authenticate with `X-Api-Key`. Select the data region when connecting: global, Germany (`euc1`), USA (`use2`), UK (`euw2`), or Australia (`apse2`). Regional ordinary API requests use `https://<region>.clockify.me/api/v1`; regional reports use `https://<region>.clockify.me/report/v1`. Global reports use `https://reports.api.clockify.me/v1`.

`get_current_user` retrieves the authenticated profile. `get_workspaces` lists accessible workspace IDs and names. Pass the selected `workspaceId` to workspace tools. Connections created before workspace discovery keep their stored workspace and region as fallbacks; an explicit tool workspace ID takes precedence.

## Available tools

- Time entries: create, list, retrieve by ID, update, delete, and stop a running timer.
- Projects: create, list, retrieve by ID, update, archive, and delete.
- Tasks, clients, tags, and user groups: create, list, update, and delete.
- Users: list workspace users and retrieve the authenticated profile.
- Reports: detailed time-entry reports with explicit page and page-size inputs, and grouped summary reports. Reports return structured data. The free plan limits both detailed and summary reports to a 31-day interval.
- Invoices: list, create, update, and delete. Clockify requires invoice number, currency, issue date, and due date when creating an invoice. Invoice updates use the header, status, and item endpoints as needed. Supplying updated items replaces all existing line items; multiple requests can leave a partially applied change if a request fails. Each supplied line item requires a description, integer quantity, and integer unit price in Clockify API units.
- Expenses: create with the required project, category, receipt, and an amount or quantity, and delete. The expense owner defaults to the authenticated user. Creation sends multipart form data.
- Time off: list requests, create a request for the authenticated user, approve or reject a request, and list policies. Status updates need the request's policy ID. Half-day creation needs the first or second half of the day. The status endpoint does not support withdrawal.
- Workspace: retrieve the selected workspace's name, image, and subscription type.

List tools expose explicit pagination where the provider supports it. Counts describe the returned page unless a tool explicitly returns a total. Billing, expense, and time-off operations require the provider's relevant plan and user permissions.

## Scope

The integration does not register event subscriptions. Provider behavior has not been exercised against live credentials as part of this refresh.
