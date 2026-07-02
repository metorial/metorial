# <img src="https://provider-logos.metorial-cdn.com/Rippiling.jpeg" height="20"> Rippling

Manage employee data, company information, and organizational structures in Rippling's unified workforce platform. Retrieve active and terminated employee details including roles, departments, and work locations. Access company information such as addresses, work locations, and contact details. Create and manage employee groups across departments and teams. Automate user provisioning and deprovisioning for third-party applications. Push ATS candidates into the Rippling onboarding flow. Approve or decline leave requests. Retrieve SAML SSO metadata for app integrations. Receive webhook notifications for employee lifecycle events such as account creation, suspension, and deletion.

## Tools

### List Departments

Retrieve all departments in the company. Supports pagination for companies with many departments.

### Get Company

Retrieve the current company's details including name, address, work locations, primary email, and phone number. The company is determined by the API token or OAuth access token used.

### Get Current User

Retrieve information about the Rippling user whose access token is being used. Useful for SSO flows and identifying the authenticated user. Returns the user's ID, work email, and company ID.

### List Custom Fields

Retrieve custom field definitions configured for the company. Custom fields allow companies to store additional employee or resource information beyond standard fields.

### Get Employee

Retrieve detailed information about a specific employee by their ID. Returns comprehensive employee data including name, email, title, department, employment status, and more.

### List Leave Types

Retrieve the company's configured leave types. Can optionally filter by the system that manages each leave type.

### Get SAML Metadata

Retrieve SAML IDP metadata for app integrations that have SAML enabled. The metadata is unique per customer app installation and changes with each new installation. Returns XML-formatted SAML metadata.

### List Employees

Retrieve a list of employees from Rippling. Can list only active employees or include terminated employees as well. Supports pagination for large result sets.

### Create Group

Create a new employee group in Rippling associated with a third-party application. Groups represent subsets of employees and can be used for department segmentation, mailing lists, access control, etc.

### List Leave Requests

Retrieve leave requests from Rippling. Can be filtered by date range and status to find specific requests.

### Push ATS Candidate

Push a candidate from an applicant tracking system directly into the Rippling onboarding flow. This initiates the onboarding process for a new hire in Rippling.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
