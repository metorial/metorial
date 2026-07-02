Now let me get more details on the specific webhook event types:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Hashnode

## Overview

Hashnode is a developer blogging platform that can also serve as a headless CMS for blogs and documentation. The Hashnode Public API is a GraphQL API that allows you to interact with Hashnode. You can query user details, publication information, posts within publications, drafts, and more. Mutations are available for actions such as publishing posts, subscribing to newsletters, and following users.

## Authentication

Hashnode uses **Personal Access Tokens (PAT)** for authentication.

- Almost all queries can be accessed without any authentication mechanism. Some sensitive fields need authentication. All mutations need an authentication header.
- The value of the Authorization header needs to be your Personal Access Token (PAT).
- To generate the token, go to https://hashnode.com/settings/developer and click on "Generate New Token". Once the token is generated, simply pass it as the `Authorization` header.

**How to authenticate:**

1. Log into your Hashnode account.
2. Navigate to https://hashnode.com/settings/developer.
3. Click "Generate New Token" to create a PAT.
4. Include the token in the `Authorization` header of your GraphQL requests.

**Endpoint:** All Hashnode Public API queries are made through a single GraphQL endpoint, which only accepts POST requests. The endpoint is `https://gql.hashnode.com`.

An example of a restricted query is getting drafts inside any blog — it can only be queried by the respective owner. Similarly, anyone can request user details but certain fields like `unsubscribeCode` and `email` require an authorization header to be present.

## Features

### Post Management

Create, read, update, and delete blog posts within a publication. The API uses a two-step publish flow: you create a draft first, then publish it. Posts support Markdown content, cover images, tags, canonical URLs, and SEO metadata. You can also publish posts directly using the `publishPost` mutation.

### Draft Management

Create and manage drafts before publishing. Drafts can only be queried by the publication owner with valid authentication. Drafts can be scheduled for future publication, and scheduled drafts can be cancelled.

### Publication Management

Query publication details including title, description, domain configuration, authors, and integrations. Publications are identified by their host (e.g., `yourblog.hashnode.dev`) or by ID. You can also manage publication members and their roles (e.g., changing roles or privacy states).

### Series Management

A "Series" allows you to group related articles on Hashnode, enabling your readers to view them in chronological order. You can create, update, and delete series, and query posts belonging to a specific series.

### Static Pages

You can create static pages in Hashnode from your admin dashboard. This feature is ideal for creating pages like an About page, a collaboration page, etc. Static pages can be queried via the API by their slug, returning title and content in Markdown or HTML.

### Comments and Replies

The GraphQL API lets you CRUD all aspects of your Hashnode blog, such as posts and their metadata, comments, or static pages. You can add comments to posts and add replies to existing comments.

### User Profiles

Query user details including username, bio, profile picture, social media links, followers/following counts, tags followed, and published posts. Some user fields (like email) require authentication.

### Newsletter Subscriptions

With the newsletter feature, you can allow readers to subscribe to your blog, and it also sends an email automatically each time you publish a new blog article. The API supports subscribing to newsletters programmatically.

### Analytics

Analytics data is integrated into the GraphQL API. The system offers filtering by individual posts, series, or page IDs. Enhanced grouping options let you sort by factors like country, device, host, and region.

### Headless CMS Usage

The APIs are the starting point for using Hashnode as a Content Management System (CMS). You can use Hashnode to create your content. However, how it is displayed and shown is completely up to you. This enables building custom blog frontends with frameworks like Next.js or Astro.

## Events

The webhooks feature in Hashnode provides a powerful way to receive notifications for specific events related to your publication. By configuring webhooks, you can integrate Hashnode with other services and automate various actions based on the events you receive.

Webhooks are configured per publication through the blog dashboard. Each webhook is configured with a destination URL and a selection of event types. Hashnode sends a signature with each request that can be used to verify the sender and prevent replay attacks. The signature is sent in the `x-hashnode-signature` header.

### Post Events

Triggered when blog posts are published, updated, or deleted within a publication. Event types:

- `post_published` — A new post is published.
- `post_updated` — An existing post is updated.
- `post_deleted` — A post is deleted.

The payload includes the publication ID, post ID, and event type. Full post content is not included in the webhook payload; use the GraphQL API to fetch post details.

### Static Page Events

Triggered when static pages are published, edited, or deleted. Event types:

- `static_page_published` — A new static page is created.
- `static_page_edited` — A static page is updated.
- `static_page_deleted` — A static page is deleted.

The payload includes the publication ID, static page ID, and event type.
