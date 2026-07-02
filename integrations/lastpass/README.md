# <img src="https://provider-logos.metorial-cdn.com/lastpass-logo.png" height="20"> Lastpass

Manage enterprise password management users, groups, and shared folders. Provision and deprovision user accounts, retrieve user data including security scores and login history, create and manage groups, view shared folder details and permissions, and query audit event logs for security monitoring. Supports batch user operations and event reporting filtered by date range and user.

## Tools

### Deprovision User

Remove or deactivate a user from the LastPass Enterprise account. Choose between deactivating (blocks login, retains data), removing (removes from enterprise but keeps personal account), or fully deleting the account.

### Get Event Report

Query the audit event log for the LastPass Enterprise account. Retrieve events such as login attempts, password changes, shared folder activity, and administrative actions within a specified date range. Optionally filter by user.

### Get Shared Folders

Retrieve all shared folders in the LastPass Enterprise account with their contained sites, user permissions (read-only, admin, give access), and security scores.

### Get Users

Retrieve user account data from LastPass Enterprise. Fetch a specific user by email or list all users with their security scores, login history, group memberships, and account status.

### Manage Group Membership

Add or remove users from groups in LastPass Enterprise. Supports batch operations to modify group memberships for multiple users at once.

### Manage User

Perform administrative actions on a LastPass user account. Reset the master password, disable multifactor authentication, or disable the user account.

### Provision Users

Create new user accounts in LastPass Enterprise. Add one or more users by email, optionally assigning them to groups and setting a full name. Provisioned users receive an email with a temporary password or activation link.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
