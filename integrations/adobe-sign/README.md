# <img src="https://provider-logos.metorial-cdn.com/docusign.svg" height="20"> Adobe Sign

Send, sign, track, and manage electronic signature agreements. Upload documents as transient files, create agreements with sequential or parallel signing workflows, and configure recipient roles (signer, approver, acceptor, form filler, delegator). Create reusable library templates with pre-configured form fields. Build embeddable web forms that generate unique signing URLs. Send agreements in bulk (MegaSign) for mass signing scenarios. Manage form fields including signatures, initials, text, dates, checkboxes, and dropdowns. Send reminders to pending participants, download audit trails, and export completed form field data. Generate embedded signing URLs for in-app signing experiences. Manage users, group memberships, and perform actions on behalf of other users. Receive real-time webhook notifications for agreement lifecycle events, web form activity, bulk send operations, and library template changes.

## Tools

### Create Agreement

Create and send a new agreement (document for signature). Supports sequential and parallel signing workflows with multiple participant roles. Documents can be referenced by transient document ID, library template ID, or URL.

### Create Library Template

Create a reusable library document template with pre-configured form fields. Templates can be shared at the user, group, or account level and used as the basis for agreements, reducing repetitive setup.

### Create Web Form

Create an embeddable web form (widget) that generates a unique signing URL. Each time a participant fills in the web form, a new agreement is generated. Web forms can be embedded on websites or shared via link.

### Download Audit Trail

Download the audit trail PDF for an agreement. The audit trail captures the complete history of events including creation, viewing, signing, delegation, and authentication actions.

### Get Agreement

Retrieve detailed information about a specific agreement including its status, participants, documents, and metadata. Optionally fetch signing URLs, form field data, or event history for the agreement.

### Get Agreement Form Data

Retrieve form field data from a completed or in-progress agreement. Returns the values that participants have entered into form fields, useful for extracting data from signed documents.

### Get Signing URLs

Retrieve signing URLs for an agreement. These URLs can be used for embedded signing within your application. Only available when the agreement is waiting for one or more participants to sign.

### List Agreements

List agreements in the account with optional filtering. Returns a paginated list of agreements with their basic details and current status.

### List Library Templates

List available library document templates. Returns reusable templates that can be referenced when creating agreements or web forms.

### List Users

List users in the Adobe Sign account. Returns user details including email, name, and group membership.

### List Web Forms

List web forms (widgets) in the account. Returns embeddable signing forms with their status and URLs.

### Send in Bulk

Send the same agreement to a large number of recipients simultaneously (MegaSign). Each recipient receives a personalized signing experience. Useful for mass onboarding, policy acknowledgments, or form collection.

### Send Reminder

Send a reminder to participants who have not yet completed their actions on an agreement. Reminders can be sent once or configured with a recurring frequency.

### Update Agreement State

Cancel or expire an agreement by updating its state. Use this to cancel agreements that are in progress, or to perform other state transitions.

### Upload Document

Upload a file to Adobe Sign as a transient document. Transient documents are temporary files (valid for 7 days) that can be referenced when creating agreements, web forms, or library templates. You must upload a document before using it in any signing workflow.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
