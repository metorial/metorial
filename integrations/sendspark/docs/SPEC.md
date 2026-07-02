# Slates Specification for Sendspark

## Overview

Sendspark is a video platform that enables users to create, personalize, and share AI-generated dynamic videos at scale. It is primarily used for sales outreach and marketing, allowing users to record videos and automatically personalize them with viewer-specific details like names, companies, and website screenshots.

## Authentication

Sendspark uses API keys for authentication. Two credentials are required for all API requests, passed as custom headers:

- **API Key** (`x-api-key`): An API Key is specific to your Sendspark workspace. It lets you access your workspace from other applications, so you can take actions via automation.
- **API Secret** (`x-api-secret`): An API Secret is specific to your Sendspark user profile. Every member of your workspace can generate their own API Secrets.

Both credentials can be found in the **API Credentials** tab in Sendspark settings at `https://sendspark.com/settings/api-credentials`. Your API Secret Key will appear for you to copy and use. Note that you will never be able to view this key again.

Additionally, a **Workspace ID** is required in all API request URLs. This is also available from the API Credentials tab.

The base URL for all API requests is `https://api-gw.sendspark.com`.

## Features

### Dynamic Video Campaign Management

Create and manage dynamic video campaigns, which serve as templates for generating personalized videos. Each campaign contains a base video that gets personalized per prospect. You can list all campaigns in a workspace, retrieve details for a specific campaign, or create new campaigns.

- Campaigns support features like AI voice cloning, dynamic backgrounds (website screenshots), and customizable share page settings (titles, messages, CTA buttons).

### Prospect Management and Video Generation

Add prospects (recipients) to dynamic video campaigns to automatically generate personalized videos for each one. Prospects can be added individually or in bulk.

- Prospect data includes: contact name, email, company, job title, and a background URL (used for website screenshot personalization).
- The `processAndAuthorizeCharge` flag must be set to `true` to confirm understanding of charges for videos exceeding plan limits.
- Duplicate handling is configurable via `forceCreation` (create new even if exists) and `payloadDepurationStrategy` (keep first or last valid entry).
- You can look up prospect data and video status by email address, which returns the share URL for the generated video.

### API Health Check

A simple endpoint to verify that the API is operational and that your credentials are valid.

## Events

Webhooks in Sendspark allow you to trigger specific events from your dynamic video campaigns. By integrating webhooks, you can automate actions based on user interactions or system events within your Sendspark account. Please note that at this time, webhooks are only available for dynamic video campaigns.

Webhooks are configured in the Sendspark Settings panel. Each webhook has a name and a target URL, and can be associated with all campaigns in a workspace or linked to specific dynamic video campaigns.

Webhooks can also be configured per-prospect when adding prospects via the API, by providing a unique `webhookUrl` and selecting specific `webhookEvents`.

The following event types are available:

### Video Created

Triggered when a new personalized video is successfully generated in a dynamic video campaign.

### Video Ready to Download

Fires when the video .mp4 file is ready for download, which may take a few minutes longer than the "Video Created" event. Useful for retrieving the .mp4 to download or upload elsewhere.

### Video Failed to Generate

Fires when a dynamic video generates with an error.

### Video Viewed

Triggered when a viewer opens or accesses a video page, regardless of whether they play the video.

### Video Played

Triggered when a viewer initiates playback of a video.

### Video Watched %

Tracks the percentage of the video a viewer has watched before pausing or closing playback.

### Video Liked

Triggered when a viewer clicks the "Like" button on a video.

### Video CTA Clicked

Triggered when a viewer clicks a Call-to-Action button on the video share page.
