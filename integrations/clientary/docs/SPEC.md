# Clientary Integration

Manage Clientary clients, contacts, leads, invoices, estimates, projects, time entries, tasks, expenses, payments, recurring invoice schedules, and staff.

## Authentication

The integration uses the API token as both username and password for HTTP Basic authentication, over HTTPS. Generate a token on your Clientary user profile and configure the account subdomain. For `https://mycompany.clientary.com`, use `mycompany`.

Requests target `https://{subdomain}.clientary.com/api/v2` and accept JSON. Actions are attributed to the staff user associated with the API token. Clientary also documents OAuth access; this integration exposes API token authentication.

[Authentication documentation](https://www.clientary.com/api)

## Supported workflows

- Create, retrieve, update, and delete clients, leads, projects, invoices, estimates, expenses, tasks, and recurring schedules.
- List, create, update, retrieve, and delete client contacts. Use `list_contacts` to discover IDs for `get_contact`.
- Log and manage project time entries. List entries for a project, optionally filtered by billed or unbilled status.
- Send invoices and estimates to comma-separated recipient email addresses. An invoice can include a PDF in the email.
- Record payments on invoices or charge a stored payment profile. Use `list_payment_profiles` to discover profile IDs for `create_payment` and recurring Autobill schedules. Profile charges apply the full outstanding invoice balance.
- List staff members and retrieve a staff member by ID. Staff creation and administration are available in the Clientary application.

Collection tools return one page where the provider supports pagination. Resource-specific client, project, update-time, date-range, and status filters are described by the corresponding tools.

## Recurring schedules

Recurring intervals accept names such as `weekly`, `biweekly`, `semimonthly`, `monthly`, `quarterly`, `semiannually`, and `annually`, or documented interval codes as strings from `1` to `11`. Additional names are `every_4_weeks`, `bimonthly`, `biennially`, and `every_4_months`.

Use action `0` to send generated invoices, `1` to leave them as drafts, or `2` to automatically bill a payment profile. Creating an Autobill schedule requires `paymentProfileId`. Zero occurrences enables unlimited recurrence. Positive occurrence-count behavior retains the existing request field; the public API guide documents remaining occurrences rather than a total-count setter, so this behavior still needs provider verification.

## Provider references

- [Clients](https://www.clientary.com/api/clients)
- [Contacts](https://www.clientary.com/api/contacts)
- [Leads](https://www.clientary.com/api/leads)
- [Invoices](https://www.clientary.com/api/invoices)
- [Estimates](https://www.clientary.com/api/estimates)
- [Projects](https://www.clientary.com/api/projects)
- [Time entries](https://www.clientary.com/api/hours)
- [Tasks](https://www.clientary.com/api/tasks)
- [Expenses](https://www.clientary.com/api/expenses)
- [Payments](https://www.clientary.com/api/payments)
- [Payment profiles](https://www.clientary.com/api/payment_profiles)
- [Recurring schedules](https://www.clientary.com/api/recurring_schedules)
- [Staff](https://www.clientary.com/api/staff)
