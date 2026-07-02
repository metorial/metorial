Now I have comprehensive information. Let me also clarify the distinction between WordPress.com API and self-hosted WordPress REST API for the specification.

# Slates Specification for WordPress

## Overview

WordPress is an open-source content management system available as a hosted service (WordPress.com) and as self-hosted software (WordPress.org). It provides a REST API for managing content including posts, pages, comments, media, users, taxonomies, and site settings. The WordPress.com REST API additionally provides access to stats, notifications, Reader subscriptions, and sharing features across WordPress.com and Jetpack-connected sites.

## Authentication

WordPress supports different authentication methods depending on whether you are integrating with the WordPress.com hosted platform or a self-hosted WordPress.org site.

### WordPress.com REST API — OAuth2 (Recommended for WordPress.com)

All authenticated requests to the WordPress.com REST API require an OAuth2 access token, which can be acquired through the Full OAuth2 Flow (required for third-party applications) or Credentials Direct Token Exchange for personal use.

**Prerequisites:**

- Register an application through the [WordPress.com Applications Manager](https://developer.wordpress.com/apps/) to obtain a **Client ID**, **Client Secret**, and **Redirect URI**.

**Authorization Code Flow (recommended for production):**

1. Redirect users to the authorization endpoint:
   `https://public-api.wordpress.com/oauth2/authorize?client_id={ID}&redirect_uri={URI}&response_type=code&scope={SCOPES}&state={STATE}`
2. When users authorize your app, WordPress.com redirects them back to your app with an authorization code. You exchange this code for an access token using your client secret.
3. Token exchange endpoint: `POST https://public-api.wordpress.com/oauth2/token` with parameters: `client_id`, `client_secret`, `code`, `grant_type=authorization_code`, `redirect_uri`.
4. Include the token in the Authorization header: `Authorization: Bearer your_token_here`.

**Implicit Flow (legacy, for browser-based apps):**

- Use `response_type=token` in the authorization URL. The token is returned directly in the URL fragment.

**Password Grant (development/testing only):**

- POST to `https://public-api.wordpress.com/oauth2/token` with `grant_type=password`, `username`, `password`, `client_id`, `client_secret`. Only works with your own credentials.

**Available OAuth2 Scopes:**
`users`, `sites`, `posts`, `comments`, `taxonomy`, `follow`, `sharing`, `freshly-pressed`, `notifications`, `insights`, `read`, `stats`, `media`, `menus`, `batch`, `videos`. Special scopes: `global` (comprehensive access across all sites) and `auth` (limited to `/me/` endpoint for identity verification).

**Optional parameters:**

- `blog`: Specific blog URL or ID to limit access to a single site.
- `state`: Recommended for CSRF protection.

**Token Validation:**

- `GET https://public-api.wordpress.com/oauth2/token-info?client_id={ID}&token={TOKEN}`

### Self-Hosted WordPress (WordPress.org) REST API — Application Passwords

As of WordPress 5.6, WordPress has shipped with Application Passwords, which can be generated from an Edit User page (wp-admin → Users → Edit User).

- The credentials can be passed along to REST API requests served over HTTPS using Basic Auth. Use the WordPress username and the generated Application Password as the Basic Auth credentials.
- Example: `Authorization: Basic base64(username:application_password)`
- The REST API base URL is `https://{your-site}/wp-json/wp/v2/`.

### Self-Hosted WordPress — Cookie Authentication

This authentication method relies on WordPress cookies. As a result this method is only applicable when the REST API is used inside of WordPress and the current user is logged in. Not suitable for external integrations.

### Self-Hosted WordPress — OAuth2 (via plugins)

WordPress does not provide OAuth2 out of the box. As such, you will need a 3rd party plugin to implement this type of authentication method. Plugins such as WP OAuth Server or the WP-API/OAuth2 plugin can add OAuth2 server capabilities.

## Features

### Content Management (Posts and Pages)

Create, read, update, and delete posts and pages. Supports custom post types, post statuses (draft, publish, pending, private), scheduling (future dates), post formats, featured images, and content revisions. The API allows you to view, create or edit content on any WordPress.com site, including blog posts, pages, comments, tags, categories, media, and many other features. Posts can be filtered by status, date, category, tag, author, and search terms.

### Taxonomies (Categories and Tags)

Manage categories, tags, and custom taxonomies. Create, update, delete, and assign taxonomy terms to posts. Supports hierarchical categories and flat tag structures.

### Media Management

Upload, retrieve, update, and delete media files (images, videos, documents) in the site's media library. Manage a site's media library. Supports setting alt text, captions, and descriptions. Media items can be attached to posts.

### Comments

View and manage comments on posts. Create, update, delete, and moderate comments (approve, spam, trash). Filter by post, status, and date.

### Users and Profiles

Manage WordPress users — create, retrieve, update, and delete user accounts. Assign roles (administrator, editor, author, contributor, subscriber). Access user profile information including the authenticated user's own profile via the `/me/` endpoint.

### Site Settings and Information

Retrieve and update general site settings such as title, description, URL, timezone, and language. Access site metadata and configuration options.

### Menus

View and manage a site's menus. Create, update, and delete navigation menus and menu items.

### Site Statistics (WordPress.com / Jetpack)

View stats for a site. Access analytics data including page views, visitors, referrers, popular posts, and traffic trends. Available for WordPress.com sites and self-hosted sites connected via Jetpack.

### Reader and Subscriptions (WordPress.com)

Manage and view a user's subscriptions to the WordPress.com Reader. Follow and unfollow blogs, view followed sites, and manage reading preferences.

### Notifications (WordPress.com)

View and manage user notifications such as likes, comments, follows, and mentions.

### Sharing (WordPress.com)

Connect and manage social media sharing services (Publicize). Configure automatic post sharing to connected social media accounts.

### Custom Post Types and Custom Endpoints

By creating custom endpoints and post types, you can tailor the API to meet the specific needs of your application. Self-hosted WordPress sites can expose custom post types and custom fields via the REST API. Plugins can register additional endpoints.

## Events

WordPress core does not include a built-in webhook system. Webhook functionality isn't part of the WordPress core—it's added through plugins.

### WooCommerce Webhooks (if WooCommerce is installed)

WooCommerce provides a native webhook system configurable via WooCommerce → Settings → Advanced → Webhooks. Webhooks can trigger events each time you add, edit or delete orders, products, coupons, or customers, when purchases are made, etc.

- **Topics**: Order created/updated/deleted/restored, product created/updated/deleted/restored, customer created/updated/deleted, coupon created/updated/deleted, and custom action topics.
- **Configuration**: Delivery URL, secret key for HMAC signature verification, status (active/paused/disabled), and API version.

### Plugin-Based Webhooks (e.g., WP Webhooks)

Third-party plugins like WP Webhooks add webhook capabilities to WordPress core. Triggers include: send data on login, register, update and deletion of a user; send data on new post, update post and delete post; send data on a new, updated, trashed, or deleted comment; send data once an email was sent from your WordPress system.

- These are not part of the standard WordPress API and require plugin installation on the WordPress site.
