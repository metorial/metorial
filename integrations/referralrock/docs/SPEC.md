# Slates Specification for ReferralRock

## Overview

Referral Rock is a referral program management platform that enables businesses to create, manage, and track referral marketing programs. It provides tools to manage referral program members, track referrals, handle rewards and payouts, and embed sharing experiences into external applications.

## Authentication

The Referral Rock API uses Basic Authentication using the credentials of your public and private API key. With each request made, you will need to include an Authorization header.

The Authorization header value is constructed by Base64-encoding the string `publicKey:privateKey`.

Example: `Authorization: Basic base64(publicKey:privateKey)`

To find your API Keys, log in to your Referral Rock account and navigate to Integrations (Settings > Integrations). Scroll down on the page until you are able to see 'Manage API Keys' under Libraries. Private API keys are only displayed one time in Referral Rock immediately after they are generated. When generating a new key, please be sure to copy the private key when it is first displayed as you won't be able to view them later.

All calls to Referral Rock's API require SSL. Ensure all requests are pointed to `https://api.referralrock.com`.

## Features

### Program Management

Retrieve and view referral programs configured in your account. Programs contain settings like member and referral offers, URLs, and aggregate statistics (views, registrations, referral counts, reward totals).

### Member Management

Create, update, list, and remove members (advocates) from referral programs. Members can be queried by program, date range, or search term. Each member has a unique referral code and URL for sharing. Members can be identified by ID, email, or external ID. You can also retrieve detailed statistics about a member's sharing, referral, and reward activities.

### Referral Management

Create, update, list, and remove referrals. Referrals can be filtered by program, member, status (Pending, Qualified, Approved, Denied), and date range. Referral status can be updated to progress referrals through the approval workflow. Referral actions can be created to trigger recurring reward processing.

### Reward Management

Create, update, list, issue, and remove rewards tied to members or referrals. Rewards can be filtered by program, member, status, and date range. Individual rewards can be issued on demand. Reward rules configured for a program can also be retrieved.

### Payout Management

View pending payouts for members and process payout transactions. Pending payouts can be filtered by member or recipient. Transactions represent actual transfers of reward funds to participants and can be looked up by recipient or transaction ID.

### Email Management

Manage email unsubscribe lists — add emails to the unsubscribe list, remove them, and query the current unsubscribed emails.

### Invite Feeds

Send contacts (single or batch) to be used with the automatic invite feature, enabling programmatic population of invite lists for referral campaigns.

### Member Access URLs

Generate unique share links, portal access URLs, and share widget URLs for members. This enables embedding a custom sharing experience or securely embedding the Member Portal or Share Widget into your own application. Members can be looked up by ID, referral code, email, or external ID.

## Events

Referral Rock supports webhooks that can be subscribed to via the API. You provide a target URL and an event name, and Referral Rock will POST event data to that URL when the event occurs. Webhook payloads are signed with an HMAC-SHA512 signature in the `RR-Signature` header for verification.

### Program Events

Notifications when a referral program is added (`ProgramAdd`), updated (`ProgramUpdate` — sent only on activation changes), or deleted (`ProgramDelete`). Includes full program details and aggregate statistics.

### Member Events

Notifications when a member is added (`MemberAdd`), updated (`MemberUpdate`), or deleted (`MemberDelete`). Includes full member profile, referral stats, sharing stats, and program association.

### Referral Events

Notifications when a referral is added (`ReferralAdd`), updated (`ReferralUpdate` — sent on any change including status), deleted (`ReferralDelete`), or when the status specifically changes (`ReferralStatusChange`). Includes referral details, associated member info, and status.

### Reward Events

Notifications when a reward is added (`RewardAdd`), updated (`RewardUpdate`), deleted (`RewardDelete`), or issued (`RewardIssue`). Includes reward details, payout information, recipient data, and payment history.

### Email Events

Notification when an email address is unsubscribed (`EmailUnsubscribed`).
