# <img src="https://provider-logos.metorial-cdn.com/deel.svg" height="20"> Deel

Manage global payroll, contracts, and compliance for international employees and contractors. Create, amend, sign, and terminate contracts across multiple types (fixed rate, pay-as-you-go, milestone, EOR). Run payroll in 120+ countries, process payments and invoices, and handle off-cycle payments. Manage timesheets, time off requests, and worker profiles. Track immigration cases, provision users via SCIM, perform background checks, and access accounting data. Manage IT assets and device lifecycle through Deel IT. Subscribe to webhooks for real-time notifications on contract changes, payments, onboarding, and other platform events.

## Tools

### Create Contract

Create a new contractor contract in Deel. Supports fixed rate, pay-as-you-go (fixed and task-based), and milestone-based contracts. Provide the contract type, worker details, compensation, and start date.

### Get EOR Country Guide

Retrieve the Employer of Record (EOR) hiring guide for a specific country. Returns country-specific requirements, validations, and employment parameters needed to create an EOR contract.

### Get Contract

Retrieve detailed information about a specific contract by its ID. Returns full contract details including worker info, compensation, status, and custom fields.

### Get Person

Retrieve detailed information about a specific person (worker) by their ID. Returns full profile including personal details, employment history, manager info, and direct reports.

### List Contracts

Retrieve a list of contracts from Deel. Supports filtering by status, contract type, and other parameters. Returns contract details including worker info, compensation, and status.

### List Invoices

Retrieve billing invoices from Deel for accounting and financial integration. Returns invoice details including amounts, dates, and statuses.

### List Organization Data

Retrieve organizational structure data from Deel. Can list legal entities, teams/groups, or departments. Useful for finding IDs needed when creating contracts.

### List Payments

Retrieve payment statements from Deel. Returns payment details including amounts, statuses, dates, and associated contracts.

### List People

Retrieve a list of people (workers) in the organization. Returns worker profiles including names, emails, employment details, and hiring types. Supports pagination.

### Manage Contract

Perform lifecycle actions on a Deel contract: amend, sign, or terminate. Use action "amend" to modify contract terms, "sign" to sign the contract, or "terminate" to end it.

### Manage Invoice Adjustments

Create, list, or review invoice adjustments for contractor contracts. Adjustments include bonuses, commissions, deductions, expenses, overtime, and more. Use "list" to retrieve, "create" to add, or "review" to approve/decline.

### Manage Time Off

Create, list, update, or delete time-off requests for workers. Use action "list" to see requests for a profile, "create" to submit a new request, "update" to modify, or "delete" to cancel a request.

### Manage Timesheets

Create, list, or review contractor timesheets. Use action "list" to retrieve timesheets for a contract, "create" to submit a new timesheet entry, or "review" to approve or decline a timesheet.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
