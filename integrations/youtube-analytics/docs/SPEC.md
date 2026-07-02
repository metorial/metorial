# Slates Specification for YouTube Analytics

## Overview

YouTube Analytics provides two complementary APIs — the YouTube Analytics API and the YouTube Reporting API — that allow channel owners and content owners to retrieve performance data about their YouTube channels, videos, playlists, and assets. The Analytics API supports targeted, real-time queries to generate custom reports in response to user interaction, while the Reporting API supports applications that can retrieve and store bulk reports. Both APIs provide metrics on user activity, ad performance, and revenue.

## Authentication

The YouTube Reporting API and YouTube Analytics API support the OAuth 2.0 protocol for authorizing access to private user data.

**OAuth 2.0** is the only supported authentication method. Google's OAuth 2.0 supports various flows including server-side web apps, JavaScript web apps, and mobile/desktop apps, but it doesn't support the device flow for YouTube Reporting and Analytics APIs, or the service account flow.

- **Authorization endpoint:** `https://accounts.google.com/o/oauth2/v2/auth`
- **Token endpoint:** `https://oauth2.googleapis.com/token`
- **Credentials:** Obtain a Client ID and Client Secret from the [Google Cloud Console](https://console.cloud.google.com/) by creating OAuth 2.0 credentials for your project. You must also enable the YouTube Analytics API and/or YouTube Reporting API for your project.

**Scopes:**

The available OAuth 2.0 scopes are:

| Scope                                                            | Description                                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `https://www.googleapis.com/auth/yt-analytics.readonly`          | View YouTube Analytics reports for your YouTube content                           |
| `https://www.googleapis.com/auth/yt-analytics-monetary.readonly` | View monetary and non-monetary YouTube Analytics reports for your YouTube content |
| `https://www.googleapis.com/auth/youtube`                        | Manage your YouTube account                                                       |
| `https://www.googleapis.com/auth/youtube.readonly`               | View your YouTube account (required for the reports.query method)                 |
| `https://www.googleapis.com/auth/youtubepartner`                 | View and manage your assets and associated content on YouTube                     |

API requests to the reports.query method now require access to the `https://www.googleapis.com/auth/youtube.readonly` scope. Ad performance reports require an authorization token that grants access to the `yt-analytics-monetary.readonly` scope.

**Important:** The service account flow is not supported because there is no way to link a Service Account to a YouTube account; attempts to authorize requests with this flow will generate an error.

## Features

### Custom Analytics Reports (YouTube Analytics API)

The API allows users to generate custom reports for channels and content owners, providing data on dimensions like date and country, and metrics like views and likes.

- Each request uses query parameters to specify a channel ID or content owner, a start date, an end date, and at least one metric. You can also provide additional query parameters, such as dimensions, filters, and sorting instructions.
- **Dimensions** include: time-based (day, month), geographic (country, province/state, continent), demographic (age group, gender), content (video, playlist, channel), traffic source, device type, operating system, playback location, sharing service, and audience retention.
- **Metrics** include: user activity (views, likes, dislikes, comments, shares, subscribers gained/lost), engagement (estimated minutes watched, average view duration, average view percentage), playlist metrics (playlist starts, playlist views, views per playlist start), annotation metrics, card metrics, ad performance metrics, and estimated revenue.
- Use the `ids` parameter with `channel==MINE` for the authenticated user's channel or `channel==CHANNEL_ID` for a specific channel, requiring ownership.
- Supports filtering by specific videos, playlists, countries, traffic sources, and more. Multiple video or playlist IDs can be specified in a single filter.
- Some data is limited when metrics do not meet a certain threshold, which can happen if a video or channel has limited traffic or if selected filters do not meet minimum thresholds.

### Channel Reports

The API provides channel reports that measure user activity metrics, including video views, ratings, and subscriptions across various report types like video, playlist, and ad performance.

- Report types include: basic user activity, time-based, geographic, playback details, playback location, traffic source, device/OS, demographics, audience retention, top videos, and ad performance reports.
- Playlist reports analyze user interactions within a channel's playlists, offering metrics like views, estimated minutes watched, and playlist starts, with options for geographic and time-based breakdowns.

### Content Owner Reports

Content owner reports contain metrics for channels linked to a specified YouTube content owner.

- Available to YouTube Partner Program content owners who manage multiple channels.
- Include all channel report types plus additional reports for claimed content, asset-level reports, and additional filtering by claimed status and uploader type.
- All API requests to retrieve content owner video reports must filter data using either the video dimension, the channel dimension, the group dimension, or a supported combination of the claimedStatus and uploaderType dimensions.

### Analytics Group Management

A YouTube Analytics group is a custom collection of up to 500 channels, videos, playlists, or assets. All of the items in a group must represent the same type of resource.

- Groups can be created, listed, updated, and deleted via the API.
- The reports.query method can retrieve aggregated data for all of the items in a group, which can aid performance analysis.
- Channel owners can create groups of videos and playlists. Content owners can create groups of videos, playlists, channels, or assets.

### Bulk Report Scheduling (YouTube Reporting API)

The YouTube Reporting API allows developers to schedule and download bulk reports containing comprehensive YouTube Analytics data for channels or content owners.

- You use the API to schedule reporting jobs, each of which identifies a report that YouTube should generate. YouTube then generates a daily report that can be asynchronously downloaded. Each report contains data for a unique 24-hour period.
- The Reporting API supports predefined reports that contain a comprehensive set of YouTube Analytics data. These reports allow you to download bulk data sets.
- Unlike the Analytics API, bulk reports are unfiltered — they contain all data, and filtering/sorting must be done client-side.
- API reports are available for 60 days from the time that they are generated. Reports are inaccessible after they are more than 60 days old.

### System-Managed Reports

YouTube automatically generates a set of system-managed reports for content owners that have access to the corresponding reports in YouTube Creator Studio. These reports provide programmatic access to ad revenue data.

- System-managed reports are available to content owners and contain ad revenue data and YouTube Premium subscription revenue data.
- These reports are generated automatically and cannot be modified or deleted by content owners.
- The YouTube Reporting API provides unique access to subtitle-related data, playlist audience retention, asset reports, and various revenue metrics that are not available through the Analytics API.

## Events

The provider does not support events. Neither the YouTube Analytics API nor the YouTube Reporting API offers webhooks or purpose-built push notification mechanisms for data changes. Data must be retrieved through direct queries or by polling for newly generated bulk reports.
