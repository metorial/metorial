Let me check the Campaign Management API and Recruitment API documentation.# Slates Specification for Hypeauditor

## Overview

HypeAuditor is an AI-powered influencer marketing platform that provides influencer discovery, analytics, fraud detection, and campaign management across Instagram, YouTube, TikTok, Twitter/X, Twitch, and Snapchat. It offers tools to analyze influencer audiences, detect fake followers, track campaign performance, and conduct competitor analysis.

## Authentication

HypeAuditor uses a **Client ID + API Token** authentication scheme. Use your Client ID and API token values to access the API. Pass them via `X-Auth-Token` and `X-Auth-Id` headers, respectively.

- **`X-Auth-Id`**: Your Client ID.
- **`X-Auth-Token`**: Your API token.

Reach out to [email protected] if you don't have them.

All API requests are made as POST requests to the base URL: `https://hypeauditor.com/api/method/{endpoint}`.

An optional `v` parameter controls API versioning. The v=1 version has been deprecated since August 1st, 2024, and users are encouraged to migrate to v=2.

The Campaign Management API uses a separate Swagger-documented endpoint with the same authentication credentials.

## Features

### Influencer Search (Suggester)

Find influencers by name and account name on Instagram, X (Twitter), TikTok, YouTube, and Twitch. Useful for quick lookups of specific creators.

### Influencer Reports

Get all the information you need about a social media creator's profile, activity, audience, content, and value. Reports are available for Instagram, YouTube, TikTok, Twitter/X, Twitch, and Snapchat. Each platform report includes metrics like audience quality score (AQS), engagement rate, follower demographics, authenticity analysis, and brand mentions. Reports also include:

- **Account Media**: Retrieve recent posts/videos for an influencer on Instagram, YouTube, and TikTok.
- **Metrics History**: Access historical performance data for Instagram, TikTok, Twitter, and Twitch accounts.
- **Brand Mentions**: View brands mentioned by creators on YouTube and TikTok.
- **Report Connections**: Find linked accounts across platforms for a given influencer.
- **PDF Export**: Generate downloadable PDF versions of influencer reports.

### Influencer Discovery

The Discovery API's filters enable you to identify influencers in a particular niche with similar follower profiles to your target audience and high levels of engagement on their content. Supports Instagram, YouTube, TikTok, Twitter/X, and Twitch with extensive filtering options including:

- Audience demographics (geography, age, gender, ethnicity, income, interests)
- Account attributes (location, language, gender, age, type, verification status)
- Performance metrics (engagement rate, quality scores, follower/subscriber counts, growth rates, views, likes)
- Content and keyword search (search across bios, content, and descriptions)
- Niche-based AI search using natural language phrases
- Similar influencer lookup (find lookalikes for a given account)
- Platform-specific filters (e.g., Twitch games and streaming hours, Twitter engagement metrics)
- A sandbox endpoint is available for testing without consuming credits.

### Post Searching by Keywords

Search for specific content posts by keywords across supported social networks. Useful for finding content related to specific topics, brands, or hashtags.

### Instagram Market Analysis (Competitor Analysis)

Check out your competitors' Instagram Share of Voice. Monitor how frequently they're mentioned in a given period and understand who they're targeting, who they're working with, and what value their content has in terms of engagement rates and reach. Reports are generated asynchronously and retrieved by report ID. Configurable by date range and audience geography.

### Campaign Management

Create influencer marketing campaigns and measure their results by tracking posts, mentions, and hashtags. Additionally, manage some aspects of content collaboration with the Campaign Management API, such as content review. Available in v1.0 and v2.0 of the API.

### Influencer Recruitment

Create and manage influencer recruitment campaigns, including setting up landing pages for attracting creators to your brand.

### Lists Management

Organize influencers into lists for campaign planning. Supports creating lists, adding/removing influencer reports to/from lists, and retrieving all lists and their contents.

### My Network (Creator Profile Info)

A public API for the My Network section of your account, allowing you to pull in influencer data programmatically. The API supports filtering by report unlock date.

### Account Activity

Track API usage including unlocked reports and remaining report/request credits.

## Events

The provider does not support events. HypeAuditor's API is request-response based and does not offer webhooks or event subscription mechanisms.
