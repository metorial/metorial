# <img src="https://provider-logos.metorial-cdn.com/webflow.jpeg" height="20"> Webflow

Manage Webflow sites, CMS content, ecommerce, and more programmatically. Create, read, update, and delete CMS collection items and collections. Manage ecommerce products, orders, and inventory. Publish sites, manage pages and components, upload and organize assets, retrieve form submissions, manage user accounts and access groups, and add custom code to sites and pages. Receive webhooks for form submissions, site publishes, page changes, ecommerce events, user account changes, and CMS item updates.

## Tools

### Get Collection

Retrieve detailed information about a CMS collection including its fields/schema. Useful for understanding the structure of a collection before creating or updating items.

### Get Site

Retrieve detailed information about a specific Webflow site, including metadata, custom domains, locale settings, and publish status.

### List Assets

List all assets (images, files, etc.) in a Webflow site's Assets panel, along with asset folders. Provides URLs, metadata, and folder organization.

### List Collection Items

List CMS collection items (staged or live). Returns items with their field data and metadata. Use the "live" flag to fetch published items instead of staged/draft items.

### List Collections

List all CMS collections for a Webflow site. Collections define the schema/structure for CMS content. Each collection contains fields and items.

### List Form Submissions

List forms for a site and retrieve their submissions. Provide a siteId to list all forms, or a formId to get submissions for a specific form.

### List Orders

List ecommerce orders for a Webflow site. Optionally filter by order status. Returns order details including customer info, items, and shipping.

### List Pages

List all pages for a Webflow site with their metadata, including titles, slugs, SEO settings, and parent-child relationships.

### List Products

List ecommerce products for a Webflow site, including associated SKUs (variants). Supports pagination for sites with many products.

### List Sites

List all Webflow sites accessible with the current authentication. Returns site metadata including names, domains, publish status, and workspace association.

### List Users

List user accounts on a membership-enabled Webflow site. Returns user details including email, status, and access group assignments.

### Manage Collection Item

Create, update, or delete a CMS collection item. Provide field data as key-value pairs matching the collection's schema. Use the collection's field slugs as keys in fieldData.

### Manage Inventory

Get or update inventory levels for an ecommerce product SKU. Use this to check stock levels or update inventory counts.

### Manage Product

Create or update an ecommerce product. Provide product details and optional SKU/variant data. When updating, only the fields you provide will be changed.

### Manage User

Invite, update, or remove a user account on a membership-enabled Webflow site. Manage access group assignments to control gated content access.

### Publish Collection Items

Publish one or more staged CMS collection items to make them live. This pushes draft changes to the published version of the items.

### Publish Site

Publish a Webflow site to make staged changes live. Optionally specify which custom domains to publish to, or publish to the Webflow subdomain.

### Update Order

Update an ecommerce order's status or details. Use this to fulfill orders, add comments, or update shipping information.

### Update Page Settings

Update a page's metadata including title, slug, description, SEO settings, and Open Graph properties. Only the fields you provide will be updated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
