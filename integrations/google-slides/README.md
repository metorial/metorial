# <img src="https://provider-logos.metorial-cdn.com/google-slides.svg" height="20"> Google Slides

Create, read, edit, and delete Google Slides presentations. Create and manipulate slides with predefined or custom layouts. Insert, style, and replace text across slides, including bulk placeholder replacement for template-based generation. Add and position shapes, text boxes, lines, and images. Embed and refresh charts linked to Google Sheets. Manage speaker notes, duplicate or reorder slides, and perform batch updates combining multiple operations in a single call. Supports automated report and deck generation using templates with placeholder text and image substitution.

## Tools

### Add Image

Inserts an image onto a slide from a public URL, or replaces all shapes matching a text pattern with an image across the presentation. The direct insert mode places an image at a specific position and size, while the replace mode is useful for template-driven image insertion.

### Add Shape

Adds a shape or text box to a slide. Position and size are specified in points. Common shape types include TEXT_BOX, RECTANGLE, ELLIPSE, and many others. After adding a shape, use the **Edit Text** tool to insert text into it.

### Batch Update

Sends multiple raw update requests to a presentation in a single atomic batch. All requests succeed or fail together. This is the most flexible tool — use it for advanced operations or when you need to combine multiple actions (e.g., create a slide, insert text, add an image) in one call.

### Create Presentation

Creates a new blank Google Slides presentation with a given title. Returns the presentation ID, title, and URL that can be used to access or further modify the presentation.

### Delete Element

Deletes a page element (shape, text box, image, chart, etc.) from a slide by its object ID. Use Get Presentation to find element IDs first.

### Edit Text

Insert, delete, or style text within a specific text box or shape element on a slide. Use this for targeted edits to individual page elements. For bulk placeholder replacement across the entire presentation, use the **Replace Text** tool instead.

### Embed Sheets Chart

Embed a chart from a Google Sheets spreadsheet into a slide, or refresh an existing linked chart to reflect updated spreadsheet data. Requires Spreadsheets scope for creating or refreshing linked charts.

### Get Presentation

Retrieves the full structure of a Google Slides presentation including all slides, page elements, masters, and layouts. Use this to inspect the presentation's content before making modifications.

### Manage Slides

Create, duplicate, reorder, or delete slides within a presentation. Supports specifying a predefined layout (e.g. BLANK, TITLE, TITLE_AND_BODY) or a custom layout ID when creating slides. Use one action at a time.

### Manage Speaker Notes

Read or update the speaker notes for a specific slide. When reading, returns the current notes text. When updating, replaces the entire notes content with the provided text.

### Replace Text

Performs bulk find-and-replace of text across an entire presentation. Ideal for filling in templates that use placeholder patterns like \

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
