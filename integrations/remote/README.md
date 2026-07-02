# <img src="https://provider-logos.metorial-cdn.com/remote.png" height="20"> Remote

Manage global employment, contractors, and payroll through Remote's Employer of Record platform. Create and onboard employees in countries worldwide with country-specific compliance handling. Manage the full employment lifecycle including onboarding, contract amendments, offboarding, and probation. Handle contractor relationships, invoices, and contract documents. Create and manage time off requests, approve or decline leave, and view balances. Access payroll calendars, payroll runs, and download payslips. Create and manage incentives, expenses, and timesheets. Estimate employment costs by country. Upload and download employment documents and files. Configure benefits, SSO, and custom fields. Manage billing documents, currency conversions, travel letters, and work authorization requests. Subscribe to webhooks for real-time notifications on employment changes, offboarding, time off, expenses, payslips, contract amendments, and more.

## Tools

### Create Employment

Create a new employment record in Remote for onboarding an employee. Requires country-specific fields which vary by country (use the country form schema tool to discover required fields). After creation, the employee can be invited to complete self-enrollment.

### Estimate Employment Cost

Calculate estimated employment costs for a specific country before hiring. Returns a breakdown of employer costs including salary, taxes, benefits, and Remote fees. Useful for budgeting and comparing hiring costs across countries.

### Get Country Form Schema

Retrieve the country-specific JSON form schema for creating or updating employments. Each country has different required fields for employment creation. Use this before creating an employment to discover the required and optional fields for a specific country.

### Get Employment

Retrieve detailed information about a specific employment record, including personal details, employment status, contract information, onboarding progress, and country-specific fields.

### List Companies

List all companies associated with your Remote account or integration. Returns company details including name, status, country, and settings.

### List Contract Amendments

List contract amendments for employments. Filter by employment or amendment status. Returns amendment details including review status and changes.

### List Countries

List all countries supported by Remote for employment. Returns country codes, names, and available features. Use country codes when creating employments or estimating costs.

### List Employments

List all employments (employees and contractors) managed through Remote. Filter by status or company to find specific records. Returns employment details including status, country, job title, and personal information.

### List Payslips

List payslips for employees. Filter by employment, date range, or pagination. Returns payslip details including period, amounts, and download status.

### Manage Expenses

Create, update, list, or retrieve expense records. Also supports listing available expense categories. Expenses include amount, currency, category, and receipt information.

### Manage Incentives

Create, update, delete, or list one-time and recurring incentives (bonuses, commissions, etc.) for employees. One-time incentives have a single effective date, while recurring incentives repeat monthly within a date range.

### Manage Offboarding

Create, list, or retrieve offboarding (termination) requests. Initiate an employee offboarding by specifying the employment, termination date, and reason. Track the offboarding status through the review and payroll submission process.

### Manage Time Off

Create, approve, decline, or cancel time off requests. Also supports listing time off records with filters and retrieving leave policy summaries for an employee.

### Manage Timesheets

List, retrieve, or approve employee timesheets. View submitted timesheets for review and approve them for payroll processing.

### Update Employment

Update an existing employment record in Remote. Can modify personal information, employment details, administrative information, and other country-specific fields. Also supports inviting the employee to start self-enrollment on the Remote platform.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
