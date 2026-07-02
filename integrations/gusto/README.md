# <img src="https://provider-logos.metorial-cdn.com/gusto.svg" height="20"> Gusto

Manage payroll, employees, contractors, benefits, and HR operations for U.S. businesses. Create and onboard companies, employees, and contractors. Run regular, off-cycle, and termination payrolls, including calculating wages, submitting payrolls for processing, and retrieving pay stubs. Manage employee compensation, jobs, addresses, tax information, and payment methods. Process contractor payments individually or in groups. Administer company benefits (health insurance, 401(k), HSA) and enroll employees. Configure pay schedules, earning types, garnishments, and time off policies. Handle tax forms (W-2, W-4, 1099, I-9) including generation, signing, and retrieval. Generate custom and general ledger reports. Receive webhook notifications for payroll, employee, contractor, benefit, and company lifecycle events.

## Tools

### Get Company

Retrieve detailed information about a Gusto company, including its profile, locations, and configuration. Use this to look up company details by company ID.

### Get Payroll

Retrieve detailed information about a specific payroll, including employee compensations, taxes, deductions, and totals.

### List Contractors

List contractors (1099 workers) for a company. Returns contractor profiles including names, types, and status.

### List Employees

List employees for a company. Supports filtering by termination status and pagination. Returns employee profiles including names, emails, and employment details.

### List Forms

List tax forms and documents for a company or a specific employee. Includes W-2, W-4, 1099, I-9, and other regulatory forms. Can also retrieve a specific form by ID.

### List Pay Schedules

List pay schedules for a company. Pay schedules define the frequency and timing of payroll runs (weekly, biweekly, semi-monthly, monthly).

### List Payrolls

List payrolls for a company. Can filter by processing status and date range. Returns payroll summaries including pay period, status, and totals.

### Manage Company Benefit

List, create, retrieve, or update company-level benefit types (health insurance, 401(k), HSA, etc.). Company benefits define the benefit plans available to employees.

### Manage Company Location

List, create, or update company locations. Locations are used for tax jurisdiction purposes and employee work addresses.

### Manage Contractor Payment

List, create, or cancel contractor payments. Create payments for individual contractors with specified wage amounts, or list/cancel existing payments.

### Manage Contractor

Create, retrieve, or update a contractor (1099 worker). - To **create**: provide companyId, type, and contractor details. - To **get**: provide contractorId. - To **update**: provide contractorId and fields to change.

### Manage Department

List, create, or update departments for a company. Departments help organize employees and can be used for reporting and payroll categorization.

### Manage Earning Type

List, create, or update custom earning types for a company. Earning types define categories of compensation (e.g., bonuses, commissions, tips) beyond standard types.

### Manage Employee Benefit

List, create, or update employee benefit enrollments. Enrolls employees in company-defined benefit plans with specified contribution amounts and deduction settings.

### Manage Employee

Create, update, retrieve, terminate, or rehire a W-2 employee. - To **create**: provide companyId, firstName, lastName, and optionally other fields. - To **get** or **update**: provide employeeId and any fields to update. - To **terminate**: provide employeeId and termination details. - To **rehire**: provide employeeId and rehire details.

### Manage Garnishment

List, create, or update wage garnishments for an employee. Supports child support and other garnishment types with configurable amounts and schedules.

### Manage Job & Compensation

Manage employee jobs and compensations. List jobs for an employee, create/update jobs, and manage compensation details (rate, payment unit, FLSA status). Jobs represent positions held by an employee, and each job can have multiple compensations with effective dating.

### Manage Time Off

List time off policies for a company or retrieve an employee's time off balances and activity. Use this to check available PTO, sick leave, or custom time off types.

### Process Payroll

Calculate or submit a payroll for processing. Use **calculate** to compute gross-to-net calculations for a payroll. Use **submit** to finalize and submit the payroll for processing (irreversible). Payrolls must be calculated before they can be submitted.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
