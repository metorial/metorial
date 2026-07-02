# <img src="https://provider-logos.metorial-cdn.com/netlify.png" height="20"> Netlify

Manage web application sites, deploys, builds, build hooks, deployed files, metadata, and hosting on Netlify. Create, update, configure, list, and delete sites. Manage environment variables with per-context values, scopes, and secret settings. Access and manage form submissions, including spam filtering. Configure DNS zones and records. Inject JavaScript or HTML snippets into site pages. Create and manage split tests (A/B testing) for traffic routing between branches. Set up notification hooks for deploy and form submission events. Purge CDN cached content by site or cache tag.

## Tools

### List Accounts

List all Netlify accounts/teams accessible by the authenticated user. Returns account IDs and slugs needed for other operations like managing environment variables and DNS zones.

### Get Site

Retrieve detailed information about a specific Netlify site, including build settings, repository configuration, deploy settings, and domain information.

### List Sites

List all Netlify sites accessible by the authenticated user. Supports filtering and pagination to browse through large numbers of sites.

### List Deploys

List deploys for a Netlify site. Returns deploy history with state, branch, and commit information. Supports pagination.

### List DNS Zones

List all DNS zones managed by Netlify DNS. Optionally filter by account slug.

### List Environment Variables

List all environment variables for a Netlify account. Optionally filter by a specific site. Shows values per deploy context.

### List Forms

List all forms for a Netlify site. Returns form metadata including submission count and creation date.

### List Form Submissions

List verified or spam form submissions for a form or site.

### Get Form Submission

Retrieve a specific Netlify form submission by ID.

### Manage Form Submission State

Mark a form submission as spam or verified.

### List Notification Hooks

List all notification hooks configured for a Netlify site. Hooks can be webhooks, email notifications, or Slack messages triggered by deploy or form submission events.

### List Notification Hook Types

List supported notification hook types, required fields, and events.

### Create Site

Create a new Netlify site. Optionally link it to a Git repository and configure build settings. The site can be created under a specific team account.

### Manage Builds

List builds for a site, retrieve a build by ID, or trigger a site build.

### Manage Build Hooks

Create, list, retrieve, update, and delete build hooks for a site.

### Manage Site Metadata

Get or replace custom metadata stored on a Netlify site.

### Manage Site Files

List deployed files for a site or retrieve metadata for a specific deployed file path.

### List Snippets

List all JavaScript/HTML code snippets injected into a Netlify site's pages. Shows both general page snippets and form thank-you page snippets.

### List Split Tests

List all A/B split tests for a Netlify site. Shows traffic distribution across branches and active status.

### Purge CDN Cache

Purge all cached content from Netlify's CDN for a site. Forces the CDN to re-fetch content from the origin on the next request.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
