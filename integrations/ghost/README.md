# <img src="https://provider-logos.metorial-cdn.com/ghost.png" height="20"> Ghost

Manage a Ghost publishing platform including posts, pages, tags, members, newsletters, tiers, and site settings. Create, read, update, and delete posts and pages with support for draft, published, and scheduled states. Organize content with tags. Browse, add, and edit members and their subscriptions. Manage membership tiers and promotional offers. Configure and manage multiple newsletters. Upload images and themes. Read site settings and staff/user data. Access published content via a read-only Content API for headless CMS use cases. Register and manage webhooks for events such as post publishing, member changes, and tag updates.

## Tools

### Browse Members

List and search members (subscribers) of your Ghost site. Supports filtering by status, label, newsletter subscription, and more. Include **newsletters** and **labels** for detailed subscription info.

### Browse Newsletters

List newsletters configured on your Ghost site. Ghost supports multiple newsletters, each independently configurable for different audiences or content types.

### Browse Pages

List and search static pages from your Ghost site. Pages are standalone content (e.g., About, Contact) separate from the blog post feed. Supports filtering, pagination, and including related resources.

### Browse Posts

List and search posts from your Ghost site. Supports filtering by status, tag, author, visibility and more using Ghost's filter syntax. Returns paginated results with post metadata.

### Browse Tags

List tags from your Ghost site. Tags are used to organize posts and pages. Use **include** with \

### Browse Tiers

List membership tiers configured on your Ghost site. Tiers define pricing levels and content access for paid subscriptions. Includes pricing details when requested.

### Browse Users

List staff users of your Ghost site. Users are staff members with role-based permissions (Contributor, Author, Editor, Administrator, Owner). This is a read-only view of staff data.

### Get Site

Retrieve site-level metadata and configuration from your Ghost instance, including title, description, logo, language, and other global settings.

### Manage Member

Create, read, update, or delete a member (subscriber) on your Ghost site. Members can be free or paid subscribers with associated labels and newsletter subscriptions.

### Manage Newsletter

Create, read, or update a newsletter on your Ghost site. Newsletters define how content is distributed via email to members.

### Manage Offer

Create, read, update, or browse promotional offers. Offers provide discounts or free trials for specific membership tiers, generating unique signup URLs.

### Manage Page

Create, read, update, or delete a static page on your Ghost site. Pages are standalone content separate from the blog post feed, commonly used for About, Contact, or other permanent pages.

### Manage Post

Create, read, update, or delete a post on your Ghost site. Supports creating drafts, publishing, scheduling, and updating content in HTML or Lexical format. Can also fetch a specific post by ID or slug.

### Manage Tag

Create, read, update, or delete a tag. Tags organize posts and pages into categories. Internal tags (prefixed with \

### Manage Webhook

Create, update, or delete a webhook on your Ghost site. Webhooks send HTTP POST payloads to a target URL when specified events occur.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
