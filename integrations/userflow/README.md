# <img src="https://provider-logos.metorial-cdn.com/userflow.png" height="20"> Userflow

Manage users, groups, and events for in-app onboarding experiences. Create, update, retrieve, list, and delete users with custom attributes. Manage groups (companies/accounts) and memberships. Track custom events for segmentation and personalization. Retrieve content objects like flows, checklists, and launchers. Manage webhook subscriptions to receive notifications for user, group, flow, checklist, and launcher events. Administer account settings, team members, and invitations.

## Tools

### Create or Update Group

Creates a new group (company) or updates an existing one (upsert). Groups represent companies, accounts, or tenants. If the group does not exist, it will be created; if it exists, given attributes are merged. Supports the same attribute operations as users (**set**, **set_once**, **add**, **append**, etc.).

### Create or Update User

Creates a new user or updates an existing one (upsert). If the user does not exist, it will be created; if it exists, given attributes are merged into the existing user's attributes. Supports attribute operations like **set_once**, **add** (increment numbers), **append** (add to arrays), and more. Can also associate the user with groups/companies in the same request.

### Delete Group

Permanently deletes a group (company) and all associated data including attributes, memberships, and events. Users who were members are left intact. This action cannot be undone.

### Delete User

Permanently deletes a user and all associated data including attributes, memberships, events, and flow history. Groups the user was a member of are left intact. This action cannot be undone.

### Get Content

Retrieves a specific content item (flow, checklist, or launcher) by ID. Can also list content versions and content sessions for a given content item.

### Get Group

Retrieves a group (company) by its ID. Returns the group's attributes and optionally its memberships.

### Get User

Retrieves a user by ID or finds a user by email. Returns the user's attributes, groups, and memberships. Supports expanding related objects.

### List Content

Lists all content objects (flows, checklists, and launchers) in the account. Can expand draft and published versions to include the actual content details.

### List Event Definitions

Lists all event definitions configured in the account. Event definitions describe the types of events being tracked (e.g. "Flow Started", "Checklist Task Completed"). Useful for understanding which events are available for segmentation and targeting.

### List Groups

Lists groups (companies) with pagination support. Returns a paginated list of groups and their attributes.

### List Users

Lists users with pagination support. Returns a paginated list of users and their attributes. Supports sorting and expanding related objects.

### Manage Webhook Subscription

Creates, retrieves, lists, or deletes webhook subscriptions. Webhooks notify your application when events occur in Userflow (user created/updated, group changes, events tracked). Use topic \*\*\

### Remove Group Membership

Removes a user from a group (company). Both the user and group remain intact — only the membership link is deleted.

### Track Event

Tracks a custom event for a user and/or group. Events can be used to segment users, personalize flows, and trigger automations. At least one of userId or groupId must be provided.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
