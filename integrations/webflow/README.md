# <img src="https://provider-logos.metorial-cdn.com/webflow.jpeg" height="20"> Webflow

Manage Webflow sites, CMS content, ecommerce, and operational site data programmatically. List and inspect sites, custom domains, pages, CMS collections and items, form submissions, comments, components, custom code, ecommerce products and orders, inventory, membership users, assets, and webhooks. Create, update, delete, publish, or transition supported resources through the current Webflow Data API. Receive webhooks for form submissions, site publishes, page changes, ecommerce events, user account changes, and CMS item updates.

## Tools

### Get Collection

Retrieve detailed information about a CMS collection including its fields/schema. Useful for understanding the structure of a collection before creating or updating items.

### Get Collection Item

Retrieve one CMS collection item by ID from the staged or live collection item endpoint. Use this to inspect field data before updating, publishing, or deleting a CMS item.

### Get Order

Retrieve one Webflow ecommerce order by ID, including customer, status, shipping, payment, and purchased item details.

### Get Page

Retrieve metadata for a Webflow page, optionally including the page DOM content. Use this before updating page settings to inspect the current page title, slug, SEO, and Open Graph metadata.

### Get Product

Retrieve one Webflow ecommerce product and its SKUs by product ID. Use this before updating a product or inspecting variant data.

### Get Site

Retrieve detailed information about a specific Webflow site, including metadata, custom domains, locale settings, and publish status.

### List Assets

List all assets (images, files, etc.) in a Webflow site's Assets panel, along with asset folders. Provides URLs, metadata, and folder organization.

### List Collection Items

List CMS collection items (staged or live). Returns items with their field data and metadata. Use the "live" flag to fetch published items instead of staged/draft items.

### List Collections

List all CMS collections for a Webflow site. Collections define the schema/structure for CMS content. Each collection contains fields and items.

### List Comments

List comment threads for a Webflow site. Use this to inspect unresolved design/content feedback connected to a site.

### List Components

List reusable components for a Webflow site. Use this to inspect component IDs and names before working with page content or site structure.

### List Custom Code

List custom code scripts configured at the site or page level. This is read-only inspection coverage; it does not create, update, or delete custom code.

### List Custom Domains

List custom domains configured on a Webflow site. Use this before publishing a site to a selected domain.

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

### Manage Webhook

List, retrieve, create, or delete Webflow webhooks for a site. Creating webhooks requires an OAuth Data Client App token with sites:write scope; Site API tokens may not be accepted by Webflow for webhook creation.

### Publish Collection Items

Publish one or more staged CMS collection items to make them live. This pushes draft changes to the published version of the items.

### Publish Site

Publish a Webflow site to make staged changes live. Optionally specify which custom domains to publish to, or publish to the Webflow subdomain.

### Update Order

Update an ecommerce order's editable details, or transition it through Webflow's supported fulfill, unfulfill, and refund endpoints.

### Update Page Settings

Update a page's metadata including title, slug, SEO settings, and Open Graph properties. Only the fields you provide will be updated.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
