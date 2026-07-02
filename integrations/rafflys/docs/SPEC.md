Now I can see that Rafflys is at `app-sorteos.com` based on the Pipedream code snippet. Let me get more details.Let me look for the actual API documentation.Now let me look for the Rafflys API documentation specifically:Let me check the Pipedream source code for Rafflys to get more details about the API:Let me look at the actual Pipedream component source on GitHub for more API details:Now I have enough information to compile the specification. Based on my research, here's what I know about Rafflys (also known as AppSorteos):

- It's a social media giveaway and contest management platform at app-sorteos.com
- Supports Instagram, Facebook, Twitter/X, YouTube, TikTok, LinkedIn, Bluesky, Twitch
- API base URL: `https://app-sorteos.com/api/v2/`
- Authentication: API keys via `X-API-KEY` header
- Features: giveaway management, fortune wheels, lead capture, winner selection, comment filtering
- API endpoints include: `/users/me`, `/promotions/{promotionId}/leads`
- The "New Lead" polling event is the only trigger available (via polling, not webhooks)
- Zapier lists "New Lead" as the only trigger
- No native webhook support found - it uses polling to check for new leads

# Slates Specification for Rafflys

## Overview

Rafflys (also known as AppSorteos) is a social media giveaway and contest management platform hosted at app-sorteos.com. It allows users to run sweepstakes, giveaways, and promotions across Instagram, Facebook, Twitter/X, YouTube, TikTok, LinkedIn, Bluesky, and Twitch, with features like random comment winner picking, fortune wheels, and lead capture forms.

## Authentication

Rafflys uses API keys for authentication. When you connect your Rafflys account, the key is used to authenticate to Rafflys APIs.

The API key must be passed in the `X-API-KEY` HTTP header on every request. The base URL for the API is `https://app-sorteos.com/api/v2/`.

Example request:

```
GET https://app-sorteos.com/api/v2/users/me
Headers:
  X-API-KEY: <your_api_key>
```

The API key can be obtained from your Rafflys account settings. No OAuth flow or additional scopes are required.

## Features

### User Account Management

Retrieve information about the authenticated user's account via the `/users/me` endpoint. This allows verifying the API key is valid and fetching account details.

### Promotion and Giveaway Management

Rafflys provides tools to run sweepstakes, contests, giveaways, and promotions on social media, allowing you to randomly pick a winner from comments. The API enables programmatic management of promotions (giveaways, contests) including creation and configuration.

- Giveaways can be run on Instagram, Twitter, YouTube, Facebook, and TikTok.
- Custom filters can be set up to only select winners from qualified entries. Filters include requiring @mentions, #hashtags, and excluding duplicate comments.

### Lead Collection

Users can launch fortune wheels with registration forms, prizes, and discounts to capture leads. The API exposes leads collected from promotions via the `/promotions/{promotionId}/leads` endpoint, returning lead data including ID and creation timestamp.

- Leads are associated with specific promotions (identified by promotion ID).
- Each lead includes fields such as ID and creation date.

### Winner Selection and Certificates

The platform filters comments based on set criteria, ensuring fair and accurate winner selection. Once the giveaway concludes, users receive a video and certificate showcasing the winners, which can be shared on social media.

### Fortune Wheel / Spin-to-Win Promotions

Fortune wheels can be customized with background colors, patterns, and gradients to match a brand. The tool also lets users control the odds for each reward.

- Can be embedded on websites.
- Supports exit-intent popups.
- Captures participant data via registration forms.

### Branding and Customization

Company logos and brand colors can be added to make the platform match the user's brand.

## Events

The provider does not support webhooks or purpose-built event subscriptions. The only available event trigger ("New Lead") works via a polling mechanism that checks the `/promotions/{promotionId}/leads` endpoint for newly collected leads. This is a polling-based approach built by third-party integration platforms (e.g., Pipedream, Zapier), not a native push mechanism from Rafflys itself.
