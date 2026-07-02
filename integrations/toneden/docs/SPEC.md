Now let me check the API reference for available endpoints:Now I have a comprehensive understanding of ToneDen's API. Let me compile the specification.

# Slates Specification for Toneden

## Overview

ToneDen is a social media marketing automation platform primarily serving creators, event promoters, and brands. It provides tools for creating and managing advertising campaigns on Facebook and Google, smart links (FanLinks) for content promotion, social unlocks, contests, and playbook-based campaign templates. The platform was acquired by Eventbrite and focuses heavily on the music and events industries.

## Authentication

ToneDen uses **OAuth 2.0** with the **Authorization Code** flow as the sole authentication method.

**Setup:**

1. Create a ToneDen account and register an app in Developer Settings at `https://www.toneden.io/settings/developer`.
2. The app requires a name, logo, URL, and one or more OAuth redirect URIs.
3. Upon creation, you receive a **Client ID** and **Client Secret**. The Client Secret is only shown once and must be stored securely.
4. The app must be reviewed and approved by ToneDen's team before API access is granted.

**Authorization Flow:**

1. Redirect the user to: `https://www.toneden.io/auth/oauth2/authorize?response_type=code&client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>`
2. After user approval, ToneDen redirects back to `<REDIRECT_URI>?code=<AUTHORIZATION_CODE>`.
3. Exchange the authorization code for an access token via a POST request to `https://www.toneden.io/auth/oauth2/token` with `grant_type`, `code`, `redirect_uri`, `client_id`, and `client_secret` in the JSON body.
4. The response contains an `access_token` of type `Bearer`.

**Using the Token:**
Include the token in the `Authorization` header as `Bearer <access_token>` on all API requests to `https://www.toneden.io/api/v1/`.

**Account Structure Note:** Access tokens are scoped to a specific artist profile (not the admin account). If a user has multiple profiles, each profile requires a separate OAuth authorization.

## Features

### Ad Campaign Management

Create, update, delete, and retrieve advertising campaigns on Facebook and Google through a unified, platform-agnostic interface. Campaigns are configured with an objective (e.g., link clicks, conversions, event RSVPs, page likes, post engagement, video views), creatives with automatic A/B testing of variations, audience targeting (interest-based, custom audiences, remarketing, lookalike audiences, Mailchimp lists, Instagram engagers, website visitors, FanLink visitors, Google search keywords), budget (daily or lifetime), and scheduling. Campaign performance insights and creative-level insights are available.

### Smart Links (FanLinks)

Create customizable landing pages that aggregate links to content across multiple platforms. Supported link types include music (album/track across streaming services), podcast episodes, livestreams, events, tours, big links (multiple arbitrary URLs), fundraisers, and custom redirect links. Links can include tracking pixels and email capture forms.

### Attachments (Social Unlocks & Contests)

- **Social Unlocks:** Gate digital content (file downloads, coupon codes, URLs, or unlisted YouTube videos) behind social actions. Every fan who completes the action receives the reward.
- **Contests:** Incentivize fans to perform social actions for a chance to win a prize. More actions increase the chance of winning. Entry data and unlock statistics (totals, platforms) can be retrieved.

### Playbook Campaigns

Create and manage playbook-based campaigns, which are pre-structured campaign templates (e.g., Spotify Growth, Instagram Growth, Remarketing Dynamic Event Ads) that automate common marketing strategies.

### User Lists & Offline Conversions

Create custom user lists for ad targeting and upload contacts to those lists. Upload offline conversion data to track actions that happen outside of digital platforms.

### User & Profile Management

Retrieve and update user profile information, and list all campaigns, links, attachments, and user lists belonging to a profile.

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism in the ToneDen API.
