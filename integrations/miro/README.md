# <img src="https://provider-logos.metorial-cdn.com/miro.svg" height="20"> Miro

Create, copy, update, and delete collaborative whiteboard boards. Add and manage sticky notes, cards, text, shapes, images from URLs, embeds, and frames. Connect items, manage tags, discover frame contents, share boards, and manage board members. Retrieve the connected user and authorized team.

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

### Get Current User

Retrieves the connected user and authorized team. Use the team ID when creating, copying, or filtering boards.

### Get Frame Items

Retrieves a page of child items inside a frame. Discover frames with Get Board Items and use the returned cursor for later pages.

### Update Tag

Updates an existing tag's title or color. Get Tags discovers tag IDs. Refresh the board to see tag changes made through the API.

### Get Tags, Attach Tag, Detach Tag, and Delete Tag

List board or item tags, attach or remove an existing tag from a card or sticky note, and delete board tags. Board tag lists include the next pagination offset when more results exist.

### Get Connectors and Delete Connector

Retrieve connectors, including their endpoint IDs and captions, or delete a connector from a board.

### Get Board Members, Update Board Member, and Remove Board Member

List board members with pagination, change a member's role, or remove board access. Share Board accepts 1 to 20 email addresses per invitation request.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
