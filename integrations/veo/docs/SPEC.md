There are multiple entities named "Veo" — the search results show Google's Veo (AI video generation), Veo sports cameras (veo.com), and VEO (veo.co.uk, a video platform). Let me clarify which "Veo" is likely intended. Given the context of an integration platform, the most likely candidate is **Veo** the sports camera company (veo.com). Let me research their API further.I see there are two different "Veo" entities with APIs - VEO (veo.co.uk) which is a video tagging/AI analysis platform, and Veo (veo.com) which is the sports camera company. Let me look at the VEO (veo.co.uk) authentication page more closely and check on their other resources.Now let me check what VEO (Video Enhanced Observation) actually is for a better overview.Now I have a comprehensive understanding of VEO (Video Enhanced Observation). Let me compile the specification.

# Slates Specification for Veo

## Overview

VEO (Video Enhanced Observation) is a video tagging and analysis platform used in education, clinical training, and corporate professional development. It allows users to upload videos, tag key moments with predefined performance markers, collaborate through groups and comments, and leverage AI analysis for insights. The platform is developed by Video Enhanced Observation Ltd., based in Newcastle upon Tyne, UK.

## Authentication

The recommended way to authenticate with the VEO API is by using OAuth2. When establishing a connection using OAuth2, you will need your access token — which you will retrieve by making an OAuth 2 request to the authorization server.

**Prerequisites:**
Before you get a token, you'll need a client ID and secret for your application. If you've not got these yet then please speak to your VEO representative.

**Token Endpoints:**
VEO offers separate environments for production and development. You'll need a separate Client ID and secret for each:

- **Production:** `https://tokenapi.veo.co.uk/oauth2/token`
- **Development/Testing:** `https://tokenapiuat.veo.co.uk/oauth2/token`

**Obtaining a Token:**

To get a token you must perform a `x-www-form-urlencoded` POST to the appropriate endpoint including the following form fields:

- `Username` — Your VEO email address
- `Password` — Your VEO password
- `Grant_type` — Must be set to `password`
- `Client_id` — Your client ID as provided by your VEO representative

The response returns an `access_token` (bearer token) and `expires_in` value (token validity in seconds, typically ~14 days).

**Using the Token:**

Once you've authenticated you'll be given a bearer token. Almost all API endpoints require this token. The recommended way to make requests is by adding the bearer token to the `Authorization: Bearer {token}` header.

**Base URLs:**

- **Production:** `https://api.veo.co.uk/api`
- **Development/Testing:** `https://apiuat.veo.co.uk/api`

## Features

### Video Management

Upload, create, retrieve, download, and list videos within the platform. The API allows access to videos in order to seamlessly integrate VEO's video and AI tools into your product and workflows. Video creation is a multi-step process: create a video resource, obtain an upload token, and then upload the file to Azure blob storage. Videos go through an automatic transcoding pipeline before becoming available for viewing. Supports multiple video and audio formats (MP4, MOV, WMV, AVI, MPEG, MP3, WAV, M4A, among others). Download tokens provide time-limited URLs for accessing transcoded videos in various resolutions.

### User Management

Access and manage users within your VEO organisation. Invite users to your organisation (individually or in bulk), create users directly without invitation emails, update user profiles, deactivate or delete users, and list users with search capabilities. Users have roles: standard User, Organisation Admin, and optionally Site Admin for multi-site organisations. When inviting users, you can automatically add them to specific groups/communities.

### Groups and Communities

VEO Groups offer different types of interactive remote learning and collaboration spaces where you can work together with others. Create, retrieve, update, delete, and list groups. Add and manage group members, including setting admin privileges. Four group types are available: Group (general collaboration), Video Bank (collection of videos), Community (focused on timelines and files), and Cohort (school-based groups). Groups can be filtered by organisation and creator.

### Comments and Notes

Create, retrieve, update, delete, and list comments on videos or tag sessions. Two types of comments exist:

- **Video comments:** Attached directly to a video, supporting threaded replies (maximum 2 levels deep).
- **Tag session notes:** Attached to specific tags within a tag session, also supporting threaded replies.

Comments and notes enable collaborative discussion around video content and tagged moments.

### Video Tagging and AI Analysis

VEO is an innovative video-tagging system which combines video and data to encourage learning and development. VEO uses pre-defined tags to mark key points in user-generated video content. Using video tags allows the user to jump directly to these crucial moments for review. Tag sessions and tag sets can be managed through the API. Upload videos for automatic analysis — minimum effort required for incredible insights in minutes. Additional endpoints for tags and AI features are available through the Swagger documentation.

### Transcripts

Retrieve transcripts for videos through the API, enabling access to text-based representations of video audio content.

### Portfolios

Manage portfolios to organise and group content. Portfolios can be created, retrieved, updated, and deleted.

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism in the VEO API.
