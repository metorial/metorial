# Slates Specification for Reddit

## Overview

Reddit is a social news aggregation and discussion platform organized into communities called subreddits, where users submit posts, comment, and vote on content. Reddit's Data API allows approved developers the ability to access and modify Reddit data programmatically, e.g., to build automated moderation tools. It enables users to fetch data from Reddit, post content, and perform various other actions, covering functionalities including accessing user profiles, fetching subreddit data, submitting posts, and managing comments.

## Authentication

Reddit exclusively uses **OAuth2** for API authentication. Clients must authenticate with a registered OAuth token.

### Setup

Register an application at https://www.reddit.com/prefs/apps. When registering, it's important to choose the correct app "type," as the type determines what authentication paths your app may take.

There are three app types:

- **Web app**: Runs as part of a web service on a server you control. Can keep a secret.
- **Installed app**: Runs on devices you don't control, such as the user's mobile phone. Cannot keep a secret, and therefore, does not receive one.
- **Script app**: Runs on hardware you control, such as your own laptop or server.

After creating the app, note down the **Client ID** and **Client Secret**.

### OAuth2 Flows

- **Authorization Code Grant** (web apps): Used for web apps and third-party integrations. Redirects users to Reddit for login and consent. Authorization URL: `https://www.reddit.com/api/v1/authorize`. Include `duration=permanent` to obtain a refresh token.
- **Implicit Grant** (installed apps): Used for browser-based apps (less secure, rarely recommended).
- **Password Grant** (script apps): The simplest option for personal use and scripts. It's not recommended for public apps, but for solo developers just trying to access their own data, it's the fastest way to get a working token. Script type apps will ONLY have access to accounts registered as "developers" of the app and require the application to know the user's password.

### Token Endpoints

- **Token URL**: `https://www.reddit.com/api/v1/access_token` (authenticate using HTTP Basic Auth with Client ID and Client Secret)
- **API Base URL**: `https://oauth.reddit.com` (all authenticated API requests go here, NOT www.reddit.com)
- Access tokens expire after one hour. If your app requires access after that time, it must request a refresh token by including `duration=permanent`.

### Scopes

All bearer tokens are limited in what functions they may perform. You must explicitly request access to areas of the API.

Available scopes used by this integration: `identity`, `edit`, `flair`, `history`, `modconfig`, `modflair`, `modlog`, `modposts`, `modwiki`, `mysubreddits`, `privatemessages`, `read`, `report`, `save`, `submit`, `subscribe`, `vote`, `wikiedit`, `wikiread`.

A full list with descriptions is available at `https://www.reddit.com/api/v1/scopes`.

### Additional Requirements

You must use a User-Agent where possible. Change your client's User-Agent string to something unique and descriptive, in the following format: `<platform>:<app ID>:<version string> (by /u/<reddit username>)`.

## Features

### Subreddit Browsing & Search

Fetch information about specific subreddits, including their descriptions, subscriber counts, and rules. Resolve posts, comments, and subreddits by fullname or URL. Retrieve posts from subreddits, sorted by criteria such as hot, new, top, and controversial. Search across Reddit for posts matching specific keywords. List and discover subreddits.

### Post & Comment Management

Submit new text or link posts to subreddits. Comment on posts and reply to comments. Upvote or downvote posts and comments. Edit and delete your own posts and comments. Save and unsave content, and list saved categories.

### User Profiles

Access public user profile information, including their post and comment history. List account history such as overview, saved, hidden, voted, and gilded content where Reddit permits it. Retrieve karma scores and trophy data.

### Private Messaging

Send and receive private messages. Read and manage the user's inbox, including marking messages as read.

### Subreddit Subscription Management

Subscribe and unsubscribe from subreddits. Retrieve a list of the authenticated user's subscribed subreddits.

### Moderation Tools

Manage subreddit moderation tasks such as approving or removing posts and comments. Access moderation logs, reports, and queues. Manage flairs and edit subreddit wiki pages.

### Flair Management

Set and manage user and post flairs within subreddits. Configure flair templates for subreddits you moderate.

### Wiki

Read and edit subreddit wiki pages. List wiki pages and view revision history.

## Events

The provider does not support events. Reddit does not offer native webhooks; you'll need to build your own webhook-like system by regularly querying Reddit's API and triggering events when new content appears.
