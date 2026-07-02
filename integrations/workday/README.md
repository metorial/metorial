# <img src="https://provider-logos.metorial-cdn.com/workday.svg" height="20"> Workday

Manage human capital management, financial management, payroll, and planning in Workday. Create, read, update, and delete employee records, job requisitions, time-off requests, benefits enrollments, and compensation details. Handle the full employee lifecycle including hiring, onboarding, promotions, transfers, and terminations. Manage financial data across accounts receivable, accounts payable, general ledger, and budgeting. Track worker time entries and attendance. Approve or reject inbox tasks and business process steps. Run custom reports via Report-as-a-Service (RaaS) and query Workday data using WQL (Workday Query Language). Manage organizational structures including supervisory organizations, cost centers, and positions. Create and manipulate custom objects to extend Workday's data model. Receive outbound event notifications for business events such as hires, terminations, and job changes.

## Tools

### Execute WQL Query

Execute a Workday Query Language (WQL) query against Workday data. WQL is a SQL-like language for high-performance querying of Workday data across functional areas. Supports **SELECT**, **FROM**, **WHERE**, **LIMIT**, and **OFFSET** clauses.

### Get Custom Report

Retrieve data from a Workday custom report via Report-as-a-Service (RaaS). Reports must be Advanced type and web-service enabled in Workday. Supports passing prompt parameters to filter report data.

### Get Time Blocks

Retrieve time tracking blocks for a specific worker. Returns recorded time entries including clock-in/out times and durations. Optionally filter by date range.

### Get Worker

Retrieve detailed information about a specific worker by their ID. Returns the full worker profile including personal information, employment details, position, compensation, organizational assignments, and status.

### List Workers

Search and list workers in Workday. Returns a paginated list of worker summaries including names, emails, titles, and organization assignments. Use **search** to filter by name or other attributes.

### List Custom Objects

List records of a specific custom object type in Workday. Custom objects extend Workday's data model for organization-specific needs.

### Get Inbox Tasks

Retrieve pending inbox tasks for a specific worker. Returns business process steps awaiting action, such as approvals, reviews, and to-do items.

### List Supervisory Organizations

Retrieve a list of supervisory organizations in Workday. Supervisory organizations represent the management hierarchy and team structure.

### Get Time Off Entries

Retrieve time-off entries for a specific worker. Returns requested time-off entries with details including dates, quantities, types, and statuses. Optionally filter by date range.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
