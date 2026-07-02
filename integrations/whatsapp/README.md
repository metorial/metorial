# <img src="https://provider-logos.metorial-cdn.com/whatsapp-logo.svg" height="20"> Whatsapp Business

Send and receive WhatsApp messages at scale, including text, images, audio, video, documents, locations, contacts, and interactive elements (buttons, lists). Manage and send pre-approved message templates for marketing, utility, and authentication purposes. Upload and download media files for use in messages. Retrieve and update WhatsApp Business profile information. Register and manage business phone numbers. Create interactive WhatsApp Flows for sign-ups, surveys, and lead capture. Monitor inbound messages, outbound message statuses, and account events via webhooks.

## Tools

### Get Business Profile

Retrieve the WhatsApp Business profile information for your phone number, including description, address, email, websites, industry vertical, and profile picture.

### Get Media URL

Retrieve the download URL for a WhatsApp media file by its media ID. The returned URL is temporary (valid for ~5 minutes) and requires the access token to download. Use this to access media files received from incoming messages.

### List Templates

List message templates in your WhatsApp Business Account. Returns template names, statuses, categories, languages, and component definitions. Use pagination to browse through large template libraries.

### Mark Message as Read

Mark an incoming WhatsApp message as read. This sends a read receipt (blue checkmarks) to the sender and also opens the 24-hour customer service messaging window.

### List Phone Numbers

List all phone numbers associated with your WhatsApp Business Account, including their verified names, display numbers, quality ratings, and verification status.

### Send Interactive Message

Send an interactive WhatsApp message with **reply buttons** or a **list menu**. Reply buttons allow up to 3 quick-reply options. List menus allow structured multi-section selection menus with up to 10 sections. Use these for structured user responses like surveys, menu selections, or quick actions.

### Send Message

Send a WhatsApp message to a recipient. Supports multiple message types: **text**, **image**, **video**, **audio**, **document**, **location**, **contacts**, **sticker**, and **reaction**. For text messages within the 24-hour customer service window, use this tool. For messages outside the window, use the Send Template Message tool instead.

### Send Template Message

Send a pre-approved WhatsApp message template to a recipient. Templates can be sent **outside the 24-hour messaging window** and are required for business-initiated conversations. Templates must be created and approved in the Meta dashboard before use. Use the List Templates tool to find available templates.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
