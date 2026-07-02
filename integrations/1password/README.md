# <img src="https://provider-logos.metorial-cdn.com/1password.png" height="20"> 1password

Manage passwords, secrets, and sensitive credentials stored in encrypted vaults. Retrieve secrets using reference URIs, create/read/update/delete vault items including API keys, passwords, SSH keys, and file attachments. Generate passwords with configurable recipes. Share items securely with expiration and recipient controls. Manage vaults, users, and groups with permissions. Monitor account activity through audit events, item usage events, and sign-in attempt events for SIEM integration.

## Tools

### Create Item

Create a new item in a 1Password vault. Supports creating logins, passwords, API credentials, secure notes, and other item types with custom fields, sections, URLs, and tags.

### Delete Item

Delete an item from a 1Password vault. This permanently removes the item and cannot be undone. To archive an item instead, use the Update Item tool with a patch operation to set the state.

### Generate Password

Generate a secure password using 1Password's password generator. Creates a temporary PASSWORD item in the specified vault with a generated password field, retrieves the generated value, then deletes the temporary item. Supports configuring length, character sets, and excluded characters.

### Get File Content

Retrieve the content of a file attachment stored on a 1Password item. Use the Get Item tool first to discover file IDs and names attached to an item. Returns the file content as text.

### Get Item

Retrieve the full details of a specific item from a vault, including all fields, sections, files, and metadata. Use this to read passwords, API keys, notes, and other secrets stored in 1Password.

### Get Server Health

Check the health and status of the 1Password Connect server, including its version and the status of dependent services. Useful for verifying connectivity and diagnosing issues.

### List Items

List items stored in a specific vault. Returns item summaries including titles, categories, tags, and URLs. Use the filter parameter to search by title or tag. For full item details including field values, use the Get Item tool.

### List Vaults

List all vaults accessible with the current credentials. Returns vault names, IDs, item counts, and metadata. Use this to discover available vaults before listing or managing items within them.

### Search Items

Search for items across one or all accessible vaults using title or tag filters. Returns matching item summaries. Useful for finding items when you don't know which vault they're in.

### Update Item

Update an existing item in a 1Password vault. Supports changing the title, tags, favorite status, URLs, and adding/updating/removing individual fields using JSON Patch operations. For simple updates, use the convenience fields. For advanced modifications, provide patch operations directly.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
