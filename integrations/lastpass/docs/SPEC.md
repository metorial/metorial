Let me get more details on the LastPass Enterprise API capabilities.Now let me look at the Nango integration docs for more details on the API structure and available commands:Now I have enough information to write a comprehensive specification. Let me compile everything:

# Slates Specification for LastPass

## Overview

LastPass is a cloud-based password manager for enterprises and individuals that securely stores credentials, enables password sharing, and provides admin controls for user provisioning and security policy enforcement. LastPass is a cloud-based password manager that stores users' login information online in a secure database and allows users to generate unique passwords for each site they visit. The Enterprise/Business API (known as the Provisioning API) allows administrators to manage users, groups, shared folders, and retrieve event reports programmatically.

## Authentication

LastPass uses a proprietary key-based authentication scheme for its Enterprise API. LastPass APIs are authenticated via a unique key called a provisioning hash. Every API request requires two credentials:

- **Company ID (CID)**: Also referred to as the Account Number or tenant ID. Navigate to the Dashboard tab. The CID (account number) is located at the top of the page, preceded by the words "Account number".

- **Provisioning Hash (provhash)**: A secret key that acts as the API secret. To create a Provisioning Hash, follow the below steps: Go to Advanced -> Enterprise API. If the user has not previously created a provisioning hash, click Create provisioning hash -> OK, then the provisioning hash is shown at the top of the page.

Both values are obtained from the LastPass Admin Console at `admin.lastpass.com`. To obtain these credentials, log in to your LastPass admin console at admin.lastpass.com and navigate to Advanced > Enterprise API.

API requests are sent as POST requests to the LastPass Enterprise API endpoint. Each request body includes the `cid`, `provhash`, and a `cmd` parameter specifying the operation. For example:

```json
{
  "cid": "1234567",
  "provhash": "your_provisioning_hash",
  "cmd": "getuserdata",
  "data": {}
}
```

If the user has already created a provisioning hash, then generating a new one will invalidate the previous hash, and will require updating all integrations with the newly generated hash.

**Requirements**: A business account is required to use the LastPass integration. Admin access to the LastPass Enterprise/Business account is needed to generate credentials.

## Features

### User Management

Administrators can provision and deprovision users through the API. Our powerful API can be used to create users, deprovision users, manage groups and auto-add users to shared folders. This includes creating new user accounts (individually or in batch), disabling/deleting accounts, and requiring master password changes. When a user is provisioned, an email is sent to the user with their temporary password or an activation link (if their account exists already).

### User Data Retrieval

User Data is used to get account details about the user. This includes retrieving information such as admin status, number of stored sites, last login time, last password change, security score, group memberships, and whether the account is active or disabled.

### Group Management

The API allows creating, managing, and deleting groups. Groups can be used to organize users and assign policies or shared folders to groups of users at once. The LastPass Provisioning API does not support managing groups for pre-configured SSO (Cloud) apps for LastPass Business accounts.

### Shared Folder Management

Detailed Shared Folder Data is used to get a detailed list of all shared folders, the sites within them, and the permissions granted to them. The API allows retrieving shared folder details including folder names, contained sites, user permissions (read-only, admin, give access), and security scores.

### Event Reporting

Event Report is used to gather information about events that have taken place in the user's LastPass Business account. Administrators can query audit logs by specifying date ranges and optionally filtering by user. Events include actions such as login attempts (successful and failed), password changes, shared folder activity, and administrative actions. Each event includes a timestamp, username, action type, IP address, and associated data.

## Events

The provider does not support webhooks or purpose-built event subscription mechanisms. Event data is only available through the Event Reporting API, which is a pull-based query interface for retrieving historical audit logs.
