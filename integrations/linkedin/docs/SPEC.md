# Slates Specification for LinkedIn

## Overview

This slate is the **member/self-serve** LinkedIn integration. It supports:

- OpenID Connect sign-in for the authenticated member
- Reading the authenticated member profile via `/v2/userinfo`
- Creating member shares with text, article links, or uploaded images
- Registering image uploads for those member shares

It intentionally does **not** include company pages, organization analytics, social moderation, or Community Management triggers.

## Authentication

This slate uses LinkedIn OAuth 2.0 Authorization Code flow against the self-serve products that can coexist in a single app:

- `openid`
- `profile`
- `email`
- `w_member_social`

Authorization URL:

- `https://www.linkedin.com/oauth/v2/authorization`

Token URL:

- `https://www.linkedin.com/oauth/v2/accessToken`

## Why This Was Split

LinkedIn separates self-serve member sharing from Community Management access. In practice, organization/page workflows need a different product path and app-review process than `Sign in with LinkedIn using OpenID Connect` plus `Share on LinkedIn`.

Because of those LinkedIn API limitations, this slate is intentionally scoped to the member use case only. The following capabilities should move to a **separate LinkedIn Community Management slate**:

- Organization/page posting
- Organization admin lookup
- Organization follower/page analytics
- Organization social activity polling or webhook workflows
- Any workflow that depends on Community Management-only scopes

## Features

### Get Profile

Reads the authenticated member identity from LinkedIn OpenID Connect userinfo and returns:

- Member ID
- Name
- Email, when granted
- Profile picture URL, when available

### Create Post

Creates a member share through LinkedIn's self-serve sharing flow. Supports:

- Text-only shares
- Article/link shares
- Image shares using a previously registered asset

### Initialize Image Upload

Registers an upload for an image that will later be attached to a member share. Returns:

- A pre-signed upload URL
- The image asset URN to reference in `Create Post`

## Exclusions

This slate does not currently expose:

- Post retrieval
- Post deletion
- Comments or reactions management
- Engagement analytics
- Organization lookup or analytics
- Triggers/events

Those features are excluded so this slate stays compatible with LinkedIn's self-serve OAuth product constraints.

## Events

This slate does not define triggers. Organization social notifications and similar workflows should live in a dedicated Community Management slate.
