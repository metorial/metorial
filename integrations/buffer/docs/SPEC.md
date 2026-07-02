Now let me check for more details on updates and interactions endpoints, and whether Buffer supports webhooks.Now let me check what interactions endpoint looks like and get the link shares endpoint.I now have enough information to write the specification. Let me compile my findings.

# Slates Specification for Buffer

## Overview

Buffer is a social media management platform that allows users to schedule, publish, and analyze posts across multiple social networks (including Twitter/X, Facebook, Instagram, LinkedIn, and Pinterest) from a single interface. The Buffer API provides access to user's pending and sent updates, social media profiles, scheduled times and more.

**Note:** Buffer is no longer accepting developer applications for their existing API and is creating a new API. Existing API users will be supported during the transition.

## Authentication

Buffer is an OAuth 2.0 provider. All of the Buffer API endpoints require authentication.

**OAuth 2.0 Authorization Code Flow:**

1. To get an access token you must first register an application. You will receive a **client ID** and **client secret**.

2. **Authorization step:** Redirect the user to the authorize endpoint:
   - URL: `GET https://bufferapp.com/oauth2/authorize`
   - Parameters: `client_id`, `redirect_uri`, `response_type=code`
   - The redirect_uri must match the Callback URL given when your app was registered.

3. **Token exchange:** Your app should swap the authorization code for an access token by POSTing it along with your client_id, client_secret, redirect_uri and grant_type=authorization_code to the token endpoint.
   - URL: `POST https://api.bufferapp.com/1/oauth2/token.json`
   - A code is valid for 30 seconds only — this swap should be performed as soon as the code is received.

4. If your request is successful, Buffer will return a long-lived access token which can be used to access the user's account details for all further API requests.

5. All requests to the Buffer API must be made using HTTPS, with the access token provided in the HTTP Authorization header, request body or query string.

There are no specific OAuth scopes. The access token grants full access to the authenticated user's account. Buffer does not support API key authentication — OAuth 2.0 is the only method.

## Features

### User Account Management

Retrieve the authenticated user's account details, including plan type, timezone, and activity information. Also allows deauthorizing a client from the user's account.

### Social Media Profile Management

A Buffer profile represents a connection to a single social media account. You can:

- Return an array of social media profiles connected to a user's account.
- Retrieve details of a specific profile, including avatar, service type, username, follower statistics, and team members.
- View and update posting schedules (days and times) for each profile.
  - Set the posting schedules for the specified social media profile. Schedules consist of arrays of days and times.

### Updates (Post) Management

Create, edit, schedule, publish, and delete social media updates (posts). This is the core feature of the API. Capabilities include:

- **Create updates:** The `text` parameter specifies the post content, while `profile_ids` is a list of IDs where the post should be published. Optionally include a `scheduled_at` timestamp, media attachments, and link attachments.
- **Edit updates:** Modify text, media, or scheduling of existing pending updates.
- **Immediate sharing:** Immediately shares a single pending update and recalculates times for updates remaining in the queue.
- **Delete updates:** Permanently delete an existing status update.
- **Queue management:** Reorder updates in the queue, shuffle them randomly, or move a specific update to the top of the queue.
- **Retrieve updates:** Get pending (queued) and sent updates for a profile, including engagement statistics (reach, clicks, retweets, favorites, mentions) on sent updates.
- Options include: `shorten` (URL shortening), `now` (share immediately), `top` (add to top of queue), `media` (attach images/links), `scheduled_at` (specific schedule time).

### Social Media Interactions

Retrieve social media interactions (such as mentions, retweets, likes, comments) for individual sent updates. The interaction type is filtered by an `event` parameter, and supported interaction types vary by social network.

### Link Sharing Statistics

Returns an object with the number of shares a link has had using Buffer. Useful for gauging the popularity of URLs across the Buffer network.

### Service Configuration

Returns an object with the current configuration that Buffer is using, including supported services, their icons and the varying limits of character and schedules. This provides character limits, schedule limits, supported interaction types, and analytics filters per social network.

## Events

The Buffer API does not natively support webhooks or event subscriptions for external consumers. There is no built-in mechanism for subscribing to real-time events (such as when a post is sent or a new update is queued) through the API itself.
