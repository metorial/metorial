# <img src="https://provider-logos.metorial-cdn.com/Google_Photos.svg" height="20"> Google Photos

Upload, manage, and organize photos and videos in users' Google Photos libraries. Create and manage albums, add enrichments (text, location, map markers), and change album titles and cover photos. Upload media items, edit descriptions, and search app-created content with filters including date ranges, content categories, and favorites. Create picker sessions that let users securely select photos and videos from their library to share with your application. Access media metadata including camera information, creation time, dimensions, and exposure details.

## Tools

### Add Album Enrichment

Add a text, location, or map enrichment to an album. Enrichments provide context between media items in an album. Specify exactly one enrichment type per call.

### Create Album

Create a new album in the user's Google Photos library. The album will be owned by your app and can be managed through the API.

### Create Picker Session

Create a new Google Photos Picker session that generates a URI where the user can select photos and videos from their library. After the user makes selections, use **Get Picker Session** to check the status and **List Picked Media** to retrieve the selected items.

### Delete Picker Session

Delete a Google Photos Picker session. This revokes access to the session and any media items selected during the session.

### Get Album

Retrieve detailed information about a specific album by its ID, including title, media item count, cover photo, and writeability status.

### Get Media Item

Retrieve detailed information about one or more media items by their IDs. Returns metadata including filename, MIME type, dimensions, camera info, and access URLs. Supports batch retrieval of up to 50 items.

### Get Picker Session

Retrieve the current status of a Google Photos Picker session. Use this to check whether the user has selected media items. When **mediaItemsSet** is true, use **List Picked Media** to get the selected items.

### List Albums

List albums created by your app in the user's Google Photos library. Returns album details including title, item count, and cover photo URL. Supports pagination for large collections.

### List Picked Media

Retrieve media items that the user selected during a Picker session. Returns access URLs, metadata, and file information for each picked item. The session must have **mediaItemsSet** set to true.

### Manage Album Media

Add or remove media items from an album. Use this to organize media items into albums created by your app.

### Search Media Items

Search and list media items created by your app. Filter by album, date range, content category, media type, or favorites. Can also list all app-created media items without filters.

### Update Album

Update the title or cover photo of an album created by your app. Provide the album ID and the fields you want to change.

### Update Media Item

Update the description of a media item created by your app.

### Upload Media

Create media items in the user's Google Photos library from previously obtained upload tokens. Each item requires an upload token (from the bytes upload step), a filename, and optionally a description. Items can be added to an album at creation time.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
