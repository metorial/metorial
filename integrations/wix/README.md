# <img src="https://provider-logos.metorial-cdn.com/wix.png" height="20"> Wix

Manage Wix-hosted websites and business solutions programmatically. Create and manage eCommerce products, inventory, carts, orders, and fulfillment. Handle bookings for appointments, classes, and courses with scheduling and availability. Create and manage events with RSVP and ticketing. Manage blog posts, forum categories, and CMS data collections. Access and update CRM contacts and site members, including roles and authentication. Configure loyalty programs, pricing plans, and subscription management. Manage restaurant menus, orders, and table reservations. Upload and organize media files. Run marketing campaigns and SEO settings. Set up automated workflows triggered by site events. Access site analytics, manage payments, and handle notifications. Account-level operations include managing sites, domains, and team members. Webhooks provide real-time events for orders, bookings, content changes, member activity, and more.

## Authentication

OAuth (Site Owner) connects a Wix site through the current external app installation flow. Sign in as the site owner and finish installation within 15 minutes. The callback must use HTTPS. Access tokens are renewed using the verified app installation; Wix does not issue refresh tokens for this flow.

App developers configure permissions in the Wix app dashboard; this method does not request URL scopes. Use an App Market listed app for managed connections that require no app-specific input. For an unlisted development app, supply the `shareUrlId` from its resolved share install link as auth input. Customers should not need to discover this app-level ID themselves.

The callback verifies the signed installation, its timestamp, the installation ID, and connection state before creating a token. This integration deliberately requires the signed-in site owner, rather than accepting signed instances belonging to site visitors, members, or collaborators. Keep callback URLs and installation credentials private. The public callback code marker only routes the request and cannot authorize a connection without a valid signed installation.

API Key and OAuth App Credentials remain available. OAuth App Credentials is the existing manual app ID, app secret, and instance ID method; its access token is not renewed and stops working when Wix expires it (about four hours), so use OAuth (Site Owner) for lasting connections.

Provider references: [external install flow](https://dev.wix.com/docs/build-apps/launch-your-app/app-distribution/install-your-app/set-up-the-external-install-flow), [signed app instances](https://dev.wix.com/docs/build-apps/develop-your-app/auth/app-instances/about-app-instances), and [OAuth tokens](https://dev.wix.com/docs/build-apps/develop-your-app/auth/authenticate-using-oauth).

## Tools

### Get Catalog Version

Retrieve the Wix Stores catalog version installed on the site. Use this before product catalog flows when you need to know whether the site uses Catalog V1 or Catalog V3.

### Get Site Properties

Retrieve the site's metadata including business name, description, logo, contact info, locale settings, and more. Returns comprehensive site configuration and business information in a single call.

### List CMS Collections

List the site's CMS data collections with their IDs, display names, types, and field structure. Use it to discover the collection ID and field keys for Manage CMS Data.

### Manage Blog

List published posts, create/update draft posts, and publish drafts on a Wix Blog. Actions: `list_posts`, `get_post`, `list_drafts`, `create_draft`, `update_draft`, `publish_draft`.

### Manage Bookings

List bookings services, query bookings, create new bookings, or cancel bookings on a Wix site. Actions: `list_services`, `get_service`, `list_bookings`, `get_booking`, `create_booking`, `cancel_booking`.

### Manage Collections

Query and retrieve product collections from a Catalog V1 Wix Store. Actions: `list`, `get`.

### Manage Contacts

Create, update, delete, or retrieve CRM contacts on a Wix site. Actions: `get`, `list`, `create`, `update`, `delete`.

### Manage CMS Data

Create, read, update, or delete items in Wix CMS data collections. Updates merge into the existing item unless a full replacement is requested. Actions: `get`, `list`, `create`, `update`, `delete`.

### Manage Events

Query and retrieve events on a Wix site. Actions: `list`, `get`.

### Manage Media

Import files from external URLs into the site's media library and list existing media files. Actions: `import`, `list`.

### Manage Members

Query and retrieve site members on a Wix site. Actions: `list`, `get`.

### Manage Orders

Search, retrieve, create, update, or cancel eCommerce orders on a Wix site. Actions: `get`, `search`, `create`, `update`, `cancel`.

### Manage Order Fulfillments

List, create, update, or delete fulfillment records for Wix eCommerce orders. Actions: `list`, `create`, `update`, `delete`.

### Manage Pricing Plans

Query and retrieve pricing plans on a Wix site using Wix Pricing Plans V3. Actions: `list`, `get`.

### Manage Products

Create, update, delete, or retrieve products from a Wix Store catalog. Supports Wix Stores Catalog V1 and Catalog V3 and detects the site's catalog version by default. Actions: `get`, `list`, `create`, `update`, `delete`.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
