# <img src="https://provider-logos.metorial-cdn.com/bamboohr.svg" height="20"> Bamboohr

Manage employee data, directory, and HR workflows in BambooHR. Create, retrieve, and update employee records including personal information, job details, compensation, and custom fields. Handle time off requests, approvals, and balances. Track employee hours with clock-in/clock-out and timesheet entries. Manage benefits, dependents, and benefit plans. Generate employee reports in CSV, PDF, JSON, or XML formats. Create and track employee goals, training records, and performance data. Manage job listings and applicant tracking. Upload and organize employee and company files and photos. Access tabular data such as job history, compensation, and education. Configure webhooks to monitor employee data changes in real time.

## Tools

### Get Account Fields

Retrieve all available employee field definitions for the BambooHR account. Returns field IDs, names, types, and aliases. Useful for discovering what fields can be used in employee requests, reports, and webhook configurations.

### Get Job Listings

Retrieve all job listings from BambooHR's applicant tracking system. Returns job summaries including titles, statuses, departments, and locations.

### Get Benefits Overview

Retrieve benefits information including benefit plans, deduction types, and optionally benefit coverages and dependents for a specific employee. Provides a comprehensive view of the company's benefits setup.

### Create Employee

Create a new employee record in BambooHR. At minimum, first name and last name are required. You can include additional fields like email, job title, department, hire date, and any other standard or custom fields.

### List Files

List files for an employee or the company. Returns file metadata organized by categories, including file IDs, names, sizes, and dates. Specify an employee ID for employee files, or omit it to list company-level files.

### Get Employee Directory

Retrieve the full company employee directory, including all employees' names, contact information, job titles, departments, and other directory fields. Useful for getting an overview of the entire organization.

### Get Employee

Retrieve detailed information about a specific employee by their ID. Specify which fields to include in the response — common fields include name, email, job title, department, hire date, status, and more. Use the **Get Account Fields** tool to discover all available field names.

### Get Employee Goals

Retrieve goals for a specific employee. Optionally filter by status. Returns goal details including title, description, progress, due date, and sharing information.

### Get Employee Table Data

Retrieve tabular data for an employee. Tables include job history, compensation, education, and other structured data. Use the **Get Account Metadata** tool to discover available table names.

### Generate Custom Report

Generate a custom report by specifying which employee fields to include. Returns data for all current employees with the requested fields. Supports JSON, CSV, PDF, and XML formats. Use the **Get Account Fields** tool to discover all available field names.

### Get Time Off Requests

Retrieve time off requests within a date range. Optionally filter by employee, status, or time off type. Returns all matching requests with their details including dates, status, type, and notes.

### Get Timesheet Entries

Retrieve timesheet entries and clock entries for a date range. Optionally filter by specific employee IDs. Returns both timesheet hour entries and clock-in/clock-out entries.

### Get Training Types

Retrieve all training types configured in BambooHR, including their IDs, names, categories, and whether they are required. Also returns associated categories.

### Update Employee

Update one or more fields on an existing employee record. Pass the employee ID and the fields to update. Both standard fields (firstName, lastName, jobTitle, department, etc.) and custom fields are supported.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
