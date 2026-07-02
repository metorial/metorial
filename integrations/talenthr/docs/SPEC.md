The page requires JavaScript. Let me search for more specific API documentation details.Let me try to access the TalentHR API documentation and help center for more specific API details.Now I have enough information to compile the specification. Based on my research:

- TalentHR is an HRIS by Epignosis for SMBs
- It uses API key authentication (generated in Settings > Domain)
- The API documentation is at apidocs.talenthr.io (JavaScript-rendered, couldn't access content)
- From the Make.com integration, the API supports: employees (hire), departments, divisions, job titles, locations, time-off requests, absences
- The public API is available on Essential plan and above
- No evidence of webhooks or event subscriptions in TalentHR's own API

# Slates Specification for TalentHR

## Overview

TalentHR is a cloud-based Human Resource Information System (HRIS) built by Epignosis, designed for small to medium-sized businesses. It provides features including employee records management, candidate onboarding, time-off tracking, document management, organizational charts, employee profiles with custom fields, applicant tracking (ATS), performance reviews, and reporting. The public API is available on the Essential plan and above.

## Authentication

TalentHR uses API key authentication. To obtain your API key, navigate to Settings, select Domain in your TalentHR account. Generate a new API key from your API settings and store it securely, as you'll need it for authentication.

The API key is included in requests to authenticate. Based on integration platform documentation (Make.com), the connection requires:

- **API Key**: Generated from TalentHR Settings > Domain section.

The API base URL follows the pattern based on your TalentHR domain. Full API documentation is available at [apidocs.talenthr.io](https://apidocs.talenthr.io/).

## Features

### Employee Management

Manage the full employee lifecycle including hiring (creating new employees), viewing employee records, and managing employee data. Add new employees (hire) to the system. Employee profiles include contact details, job titles, departments, custom fields, and organizational hierarchy.

### Organizational Structure

Create and manage the building blocks of your organization's structure:

- Create departments in your system.
- Create divisions in the system.
- Create job titles in the system.
- Create locations in the system.

### Time Off Management

Manage employee absences and time-off requests through the API:

- List employees who are absent on a specific period.
- List employees out of the company today and tomorrow.
- Respond to an employee's time off request (approve or reject).
- TalentHR supports all standard leave types, including vacation, sick leave, and work-from-home days, as well as custom types like parental leave and time off in lieu.

### Applicant Tracking

TalentHR lets you create a branded careers page with your company's branding and open roles, and you can display job openings on your website using TalentHR's WordPress plugin, Zapier integration, or public API.

- The API can be used to manage and expose job openings externally.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms through its API. TalentHR integrates with third-party automation platforms like Zapier and Make for workflow automation, but these rely on polling rather than native webhook support from TalentHR.
