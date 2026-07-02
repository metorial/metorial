# <img src="https://provider-logos.metorial-cdn.com/miro.svg" height="20"> Miro

Create, manage, and organize collaborative whiteboard boards. Add and update board items including sticky notes, shapes, cards, text, images, documents, embeds, and frames. Connect items with configurable connectors, group items together, and categorize with tags. Share boards and manage board members with role-based permissions. Create mind maps and flowcharts (experimental). Subscribe to webhooks for board item change notifications. Enterprise features include project management, organization and team administration, audit logs, data classification, eDiscovery, and SCIM user provisioning.

## Tools

### Copy Board

Creates a copy of an existing Miro board. Optionally set a new name, description, or target team for the copy.

### Create Board Item

Creates a new item on a Miro board. Supports sticky notes, cards, text, shapes, images (from URL), embeds, and frames. Choose the item type and provide the relevant fields.

### Create Board

Creates a new Miro board. Optionally configure sharing and permissions policies. The board can be assigned to a specific team.

### Delete Board Item

Deletes an item from a Miro board. Works for any item type (sticky notes, cards, shapes, text, images, etc.).

### Delete Board

Permanently deletes a Miro board. This action cannot be undone.

### Get Board Items

Retrieves items from a Miro board. Can fetch all items, a single item by ID, or filter by item type. Supports pagination.

### Get Board

Retrieves detailed information about a specific Miro board by its ID, including its name, description, sharing policies, owner, and team info.

### List Boards

Lists Miro boards accessible to the authenticated user. Can filter by team or project. Supports pagination.

### Share Board

Shares a Miro board by inviting users via email. You can specify a role for the invited members and include an optional message.

### Create Connector

Creates a connector (line) between two items on a Miro board. Both start and end items must already exist on the board. Supports straight, elbowed, and curved connector shapes.

### Create Tag

Creates a tag on a Miro board. Tags can be attached to cards and sticky notes for categorization. Each item can have up to 8 tags.

### Update Board Item

Updates an existing item on a Miro board. Supports updating sticky notes, cards, text, and shapes. Only provided fields will be modified.

### Update Board

Updates a Miro board's name, description, or sharing/permissions policies.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
