# <img src="https://provider-logos.metorial-cdn.com/hootsuite.png" height="20"> Hootsuite

Schedule, publish, and manage social media messages across multiple platforms (Twitter, Facebook, Instagram, LinkedIn, Pinterest). Upload media (images and videos) for use in scheduled posts. Retrieve and manage social profiles, organizations, teams, and members. Approve, reject, or delete scheduled messages. Shorten links using Ow.ly. Receive real-time webhook notifications for message, comment, and application events. Manage member permissions and onboard users via SCIM provisioning.

## Tools

### Get User Info

Retrieve the authenticated user's profile information and their associated organizations.

### List Messages

Retrieve scheduled, sent, or pending-approval messages within a time range. Can filter by social profile IDs and message state. Also supports fetching a single message by ID.

### List Social Profiles

Retrieve social profiles accessible to the authenticated user, or fetch details for a specific social profile. Social profiles represent connected social media accounts (Twitter, Facebook, Instagram, LinkedIn, Pinterest).

### Manage Message

Approve, reject, or delete a scheduled message. Use **approve** or **reject** for messages in PENDING_APPROVAL state (requires the sequenceNumber from the message). Use **delete** to remove a scheduled message entirely.

### Manage Organization Members

List, retrieve, invite, or remove members in a Hootsuite organization. Use **list** to see all members. Use **get** to fetch a specific member's details and permissions. Use **invite** to add a new member by email. Use **remove** to delete a member from the organization.

### Manage Teams

List, create, and manage teams within a Hootsuite organization. Use **list** to see all teams in an organization. Use **get** to fetch a team's details. Use **create** to create a new team. Use **add_member** or **remove_member** to manage team membership. Use **list_members** to see members in a team. Use **list_social_profiles** to see social profiles assigned to a team.

### Schedule Message

Schedule a social media post to one or more social profiles at a specific date and time. Supports text content, media attachments, location tagging, tags, and email notifications. The scheduled time must be in **UTC ISO-8601 format** (e.g. \

### Shorten Link

Shorten a URL using Hootsuite's Ow.ly link shortener. Returns a shortened Ow.ly URL for use in social media posts.

### Upload Media

Create a pre-signed upload URL for media files or check the status of a previously initiated upload. Use **create** to get an upload URL for a file, then upload the file directly to the returned S3 URL. Use **status** to check whether media processing is complete before attaching to a message.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
