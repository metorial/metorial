# Sendspark API Specification

## Overview

Sendspark is a video platform that enables users to create, personalize, and share AI-generated dynamic videos at scale. It is primarily used for sales outreach and marketing, allowing users to record videos and automatically personalize them with viewer-specific details like names, companies, and website screenshots.

## Authentication

Sendspark uses API keys for authentication. Two credentials are required for all API requests, passed as custom headers:

- **API Key** (`x-api-key`): An API Key is specific to your Sendspark workspace. It lets you access your workspace from other applications, so you can take actions via automation.
- **API Secret** (`x-api-secret`): An API Secret is specific to your Sendspark user profile. Every member of your workspace can generate their own API Secrets.

Both credentials can be found in the **API Credentials** tab in Sendspark settings at `https://sendspark.com/settings/api-credentials`. Your API Secret Key will appear for you to copy and use. Note that you will never be able to view this key again.

The connected workspace is discovered from `GET /v1/workspaces/identifier` during authentication. Existing saved workspace routing remains available. Workspace-scoped tools also accept an optional `workspaceId` from `list_workspaces`; an explicit tool value takes precedence over saved connection routing, then the credential-bound workspace is used. Setup does not require a workspace ID.

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

The existing `check_health` tool retains `GET /v1/auth/health`, documented in the [official API guide](https://help.sendspark.com/api-automatically-create-dynamic-videos-via-api). The published OpenAPI does not include its response schema. New authentication uses the documented workspace identifier endpoint.

## Events

Webhooks in Sendspark allow you to trigger specific events from your dynamic video campaigns. By integrating webhooks, you can automate actions based on user interactions or system events within your Sendspark account. Please note that at this time, webhooks are only available for dynamic video campaigns.

Webhooks are configured in the Sendspark Settings panel. Each webhook has a name and a target URL, and can be associated with all campaigns in a workspace or linked to specific dynamic video campaigns.

Webhooks can also be configured per-prospect when adding prospects via the API, by providing a unique `webhookUrl` and selecting specific `webhookEvents` inside the `prospect` object. Bulk requests may provide these fields on each prospect. These are outbound provider notifications; the integration does not expose inbound event subscriptions.

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


## Additional operations

- `get_workspace` identifies the API key's workspace; `list_workspaces` returns accessible workspace names and IDs.
- `get_dynamics_settings` returns supported personalization languages; `update_campaign_settings` changes `useFallbackData` without altering other settings.
- `get_prospect` can request `emailEmbedHTML` and `fields`, and exposes the real prospect ID and original background URL when returned.
- `get_transcript_status` reads `none`, `processing`, `ready`, or `failed` without starting transcription. `get_transcript` reads ready transcript text and timed segments.
- `download_transcript` prepares a WebVTT or SubRip download through the authenticated transcript endpoint after checking readiness. Output contains metadata, never subtitle file contents. The stable endpoint has no documented URL expiry; none is invented. Provider readiness, download access, and account permissions can change after the check.

## Pagination and compatibility

`list_campaigns` retains the existing numeric `offset` and `limit` inputs, creator filter, search behavior, and omitted defaults; optional `sortOrder` is forwarded when supplied. The current reference lists these parameters without publishing pagination limits or a successful response schema. Existing pagination metadata is returned when supplied by Sendspark. Complete JSON responses are retained on existing tools alongside their normalized fields, so additional provider data is not lost.

All seven original tool keys and field contracts remain available. Prospect processing still authorizes charges as documented in the existing tools; no additional read request blocks those mutations when workspace routing is already saved. Optional prospect personalization values are forwarded without trimming or converting old falsy omissions.

## Documentation and verification limits

The [official reference](https://help.sendspark.com/api-reference) and [OpenAPI](https://help.sendspark.com/api-reference/openapi.json) document API-key and API-secret headers, workspace discovery, campaigns, prospects, settings, and transcripts. The current OpenAPI labels itself a draft; several campaign responses are generic objects or omit a success response definition. Those gaps do not establish endpoint retirement or missing output values. Required legacy campaign output fields remain unchanged.

This refresh was verified with local build, type checking, formatting, and original-schema comparisons. It did not make live provider calls or run live end-to-end tests; credential acceptance, billing behavior, provider response shapes, webhooks, pagination, and actual subtitle downloads remain unverified against an account.
