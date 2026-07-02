# <img src="https://provider-logos.metorial-cdn.com/evernote.png" height="20"> Evernote

Create, read, update, and delete notes, notebooks, and tags in Evernote. Manage note content written in ENML markup, attach files and resources to notes, and share notes or notebooks with other users. Search notes by full text, title, tags, date, location, or notebook. Organize notes with tags and saved searches. Access shared and linked notebooks from other users. Set reminders on notes and store custom application-specific data. Receive webhook notifications when notes are created or updated. Supports both personal and Evernote Business accounts, including business notebooks and business-specific data.

## Tools

### Copy Note

Copy a note to a different notebook. Creates a new note with the same content, tags, and resources in the target notebook. The original note remains unchanged.

### Create Note

Create a new note in Evernote. The content can be plain text or ENML (Evernote Markup Language, a subset of XHTML). If plain text or simple HTML is provided, it will be wrapped in the required ENML envelope automatically.

### Create Notebook

Create a new notebook in Evernote. Optionally assign it to a stack for organizational grouping.

### Delete Note

Move a note to the trash. The note can be recovered from trash by the user. Permanent deletion (expunge) is not available to third-party integrations.

### Get Note Content

Retrieve only the ENML content body of a note. This is a lightweight alternative to **Get Note** when you only need the note body and not the metadata.

### Get Note

Retrieve a note's full details including its ENML content, metadata, tags, and resource info. Use this to read a specific note by its GUID.

### List Notebooks

List all notebooks in the user's Evernote account. Returns notebook names, GUIDs, stack groupings, and whether each is the default notebook. Use this to discover available notebooks before creating or moving notes.

### List Tags

List all tags in the user's account, or only tags used within a specific notebook. Tags can form a hierarchy via parent-child relationships.

### Manage Tag

Create a new tag or update an existing tag's name or parent. Tags organize notes and can form hierarchies via parent-child relationships. To remove a tag from all notes, use the **untagAll** action.

### Search Notes

Search for notes using Evernote's search grammar or filter by notebook, tags, and other criteria. Returns note metadata (title, dates, notebook, tags) without full content. Use **Get Note** to retrieve content for individual results. Supports Evernote search operators in the \

### Update Note

Update an existing note's title, content, tags, notebook assignment, or attributes. Only provided fields will be changed.

### Update Notebook

Update an existing notebook's name or stack assignment. Provide the notebook GUID and the fields to change.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
