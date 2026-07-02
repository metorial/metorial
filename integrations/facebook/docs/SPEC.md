Now I have enough information to write the specification.

# Slates Specification for Facebook

## Overview

Facebook (Meta) is a social networking platform that provides the Graph API as its primary programmatic interface. The Graph API is the primary way to get data in and out of Facebook's platform — it's a low-level HTTP-based API that can be used to query data, post new stories, manage ads, upload photos, and a variety of other tasks. The API is built on a graph-based structure where nodes (users, pages, posts, events) are connected by edges (relationships) and have fields (attributes).

## Authentication

Facebook uses **OAuth 2.0** for authentication via the Authorization Code Grant flow.

### Prerequisites

- You need to create a Facebook App on the Meta for Developers platform, which provides you with an **App ID** and **App Secret**. You'll use these credentials to access the Graph API and perform actions on behalf of users.
- Apps in Development Mode only work for admins, developers, and testers of the app. The app must be set to Live mode for public use.

### OAuth 2.0 Flow

1. **Authorization URL:** `https://www.facebook.com/v{version}/dialog/oauth`
   - Parameters: `client_id` (App ID), `redirect_uri`, `state`, `scope` (comma-separated permissions)
2. **Token Exchange URL:** `https://graph.facebook.com/v{version}/oauth/access_token`
   - Parameters: `client_id`, `redirect_uri`, `client_secret`, `code` (authorization code)

### Access Token Types

- **User Access Token:** Obtained through the OAuth flow. Represents a user and grants access based on permissions the user approved. Short-lived tokens expire quickly; they can be exchanged for long-lived tokens lasting up to 60 days.
- **Page Access Token:** Derived from a user access token. Allows actions on behalf of a Facebook Page the user administers.
- **App Access Token:** Generated using the App ID and App Secret directly (`grant_type=client_credentials`). Used for app-level operations that don't require user context.

### Token Exchange (Short-lived to Long-lived)

Exchange a short-lived token for a long-lived one via: `https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id={App_Id}&client_secret={App_Secret}&fb_exchange_token={short-lived-access_token}`

### Scopes (Permissions)

Apps may request `public_profile` and `email` from any person without submitting for review by Facebook. To ask for any other permission, your app will need to be reviewed by Facebook.

Common permission scopes include:

- **User data:** `public_profile`, `email`, `user_posts`, `user_photos`, `user_videos`, `user_location`, `user_birthday`, `user_link`, `user_events`
- **Pages:** `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `pages_manage_metadata`, `pages_read_user_content`, `pages_manage_engagement`
- **Messaging:** `pages_messaging`
- **Ads:** `ads_read`
- **Business:** `business_management`
- **Lead generation:** `leads_retrieval`

### App Review

Requesting advanced permissions may require you to submit your app for review in order for your users to get access to these permissions.

## Features

### User Profile Data

Access user profile information including name, profile picture, email, birthday, and other fields depending on granted permissions. Data availability depends on the user's privacy settings; some information might not be accessible even with granted permissions if the user has restricted access.

### Page Management

Manage Facebook Pages and groups, schedule posts, and access analytics. This includes publishing posts, managing page settings, responding to comments, and reading page insights. Requires appropriate Page permissions and a Page access token.

### Content Publishing

Publish posts, photos, videos, and links to Pages. Facebook provides Video API for publishing short and long videos, and Live Video API for scheduling live broadcasts, streaming video, and interacting with audiences.

### Advertising and Marketing

The Facebook Graph API enables developers to integrate advertising reporting capabilities into their applications, allowing them to read ad accounts, list campaigns, and track campaign performance. This integration exposes read-only Marketing API reporting workflows and requires the `ads_read` permission.

### Analytics and Insights

The Graph API provides access to valuable analytics and insights data, allowing developers to track user interactions, measure app performance, and gain valuable insights into user behavior. Page Insights provide metrics on reach, engagement, demographics, and content performance.

### Lead Generation

Subscribe to and retrieve leads from Facebook Lead Ads. Leads are collected through forms attached to ad campaigns and can be retrieved via the API or received via webhooks using the `leadgen` subscription field.

### Social Interactions

Read and manage comments, reactions, and shares on posts. Access a user's friends list (limited to friends who also use the app). Enable sharing content from external applications to Facebook.

### Search

Search for places, pages, and other public objects within the Facebook social graph using the search endpoints.

## Events

Facebook supports **Webhooks** for real-time event notifications. There are many types of objects in the Facebook Social Graph, such as User objects and Page objects, so whenever you configure a Webhook you must first choose an object type. Since different objects have different fields, you must then subscribe to specific fields for that object type.

Webhook setup requires providing a **Callback URL** (HTTPS with valid TLS/SSL) and a **Verify Token**. Facebook verifies the endpoint by sending a GET request with a challenge that must be echoed back.

### Page Events

Subscribe to changes on Facebook Pages. Available fields include:

- **feed:** Notifications for new posts, comments, reactions, and shares on the Page.
- **messages / messaging_postbacks:** Notifications when users send messages to the Page via Messenger, or interact with message buttons.
- **leadgen:** Notifications when new leads are generated from Lead Ads associated with the Page.
- **ratings / reviews:** Notifications about Page ratings and reviews.
- **mention:** Notifications when the Page is mentioned.

Requires the Page to install the app via the `/{page-id}/subscribed_apps` endpoint with a Page access token.

### User Events

Subscribe to changes on User objects for app users. Available fields include:

- **photos:** Notifications when a user uploads a new photo.
- **email:** Notifications when a user changes their email address.
- **friends:** Notifications about changes to a user's friend list (limited to app users).
- **feed:** Notifications about changes to a user's feed.

### Permissions Events

Subscribe to changes in app permissions granted by users. Notifies when users grant or revoke permissions for the app.

### Application Events

Subscribe to application-level events such as:

- **order_status:** Notifications for in-app purchases, refunds, or chargebacks.
- **subscription_started / subscription_renewal_success:** Notifications for subscription lifecycle events.

### Instagram Events

Subscribe to Instagram-related changes (when using the Instagram Graph API through a Facebook App), such as comments and mentions on Instagram Business/Creator accounts.
