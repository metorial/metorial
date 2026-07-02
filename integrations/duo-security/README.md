# <img src="https://provider-logos.metorial-cdn.com/duo-security.png" height="20"> Duo Security

Manage multi-factor authentication, users, devices, and access security. Create, read, update, and delete users, groups, phones, hardware tokens, and administrators. Perform two-factor authentication via Duo Push, phone call, SMS, hardware tokens, and WebAuthn/FIDO2. Manage Duo-protected applications and configure access policies by user group or application. Retrieve authentication logs, administrator action logs, and telephony logs. Read and update account settings, trigger directory syncs, and manage trusted endpoints. Supports MSP partner account management for creating and managing child Duo accounts.

## Tools

### Create Bypass Codes

Generate one-time bypass codes for a Duo user. Bypass codes allow users to authenticate when they don't have access to their normal MFA device.

### Create User

Create a new Duo Security user. Optionally send an enrollment email to the user so they can set up their MFA device.

### Delete User

Permanently delete a Duo Security user and all associated data including phones, tokens, and group memberships.

### Get Account Summary

Retrieve a summary of the Duo account including user counts, integration counts, telephony credits, and current account settings.

### Get Administrator Logs

Retrieve Duo administrator action logs. Returns records of actions performed by administrators such as user creation, policy changes, and configuration updates.

### Get Authentication Logs

Retrieve Duo authentication log events using the v2 API. Returns detailed records of authentication attempts including user, application, result, and device information. Events have a 2-minute delay before becoming available.

### Get Telephony Logs

Retrieve Duo telephony log events. Returns records of phone calls and SMS messages sent for authentication purposes, including costs and outcomes.

### Get User

Retrieve detailed information about a specific Duo user, including associated phones, tokens, groups, and WebAuthn credentials.

### List Integrations

Retrieve a list of Duo-protected applications (integrations). Each integration represents an application that uses Duo for authentication.

### List Users

Retrieve a list of Duo Security users. Supports filtering by username or email, and pagination for large result sets.

### List Admins

Retrieve a list of Duo Security administrator accounts with their roles and contact information.

### List Groups

Retrieve a list of Duo Security groups. Groups are used to organize users and apply policies.

### List Phones

Retrieve a list of phones registered in Duo Security. Phones are MFA devices associated with users.

### Update User

Update a Duo Security user's profile, status, group memberships, or phone associations. Supports modifying user fields, adding/removing groups, and associating/disassociating phones in a single operation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
