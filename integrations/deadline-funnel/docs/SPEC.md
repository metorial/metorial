# Slates Specification for Deadline Funnel

## Overview

Deadline Funnel is a marketing tool that creates personalized countdown timers and deadlines for sales pages and evergreen campaigns. It enables users to add countdown timers and deadlines directly on sales pages, commonly used to drive sales for new product launches and evergreen campaigns. It integrates with email service providers and page builders to trigger and track individual subscriber deadlines.

## Authentication

Deadline Funnel uses **API Key** authentication. Users generate an API key from their Deadline Funnel dashboard by navigating to the API section. The API key is passed as a Bearer token in the `Authorization` header.

- **Base URL:** `https://app.deadlinefunnel.com/api/v1`
- **Header:** `Authorization: Bearer {api_key}`

For third-party integrations (e.g., Teachable), you add your Deadline Funnel API Key from your Deadline Funnel account.

Deadline Funnel also generates **per-campaign webhook URLs** that are used to receive incoming data (e.g., from email platforms). To find a webhook URL, navigate to the Integrations tab in the top menu, identify the campaign, and click 'Edit Integration'. These webhook URLs are unique to each campaign and integration.

## Features

### Deadline Tracking Management

Start personalized deadline countdowns for individual subscribers/leads. You can use webhooks to start the tracking for a subscriber in one of your campaigns. This only works for starting the deadline tracking, and isn't currently possible with sales tracking via custom code. Each lead is identified by email address. You choose the Deadline Funnel campaign/promotion to trigger and select the email address field to capture emails.

- Requires specifying which campaign to associate the deadline with.
- For the integration to work, subscribers must click Deadline Funnel email links before reaching a page with a countdown timer. This is necessary to ensure each subscriber is assigned the correct deadline.

### Sales Tracking

Sales Tracking works through a webhook. Instead of creating a tracking record under 'Tracking Started' and assigning a deadline, it creates a tracking record under the 'Sales Tracked' section. This record includes the subscriber's email, date of purchase, and the amount and currency specified.

- Amount and currency are configured when creating the sales tracking webhook.
- Deadline Funnel does not have the ability to store two separate webhooks inside of one campaign, so tracking multiple price points requires generating webhooks sequentially.

### Email Platform Integrations

Connect Deadline Funnel to email service providers to automatically start deadlines based on automation triggers. Supported platforms include ActiveCampaign, AWeber, ConvertKit (Kit), Drip, GetResponse, HighLevel, HubSpot, Keap, Mailchimp, MailerLite, Ontraport, Sendlane, and others. With the API connection you can trigger and start a Deadline Funnel campaign any time your email service provider runs a rule or automation in the background.

### ConvertHub / Portal

Deadline Funnel includes ConvertHub, an app that allows you to use Portal functionality outside of a Deadline Funnel campaign. Portal features include social proof display, opt-in forms, microsurveys, custom events, and analytics.

- Portal can be added to any website page.
- Custom Events can be created and displayed in Portal's Social Proof widget.

### Custom Events

Custom Events can be created in Deadline Funnel (e.g., via Zapier's "Create Custom Event" action). These events can be used for social proof displays and analytics tracking.

## Events

Deadline Funnel has limited event/webhook support. It primarily acts as a **webhook receiver** (accepting inbound webhooks to trigger deadlines and sales tracking) rather than a webhook sender.

The following outbound triggers are available (primarily through Zapier):

### New ConvertHub Portal Created

Triggers when a new portal is created.

### New Custom Event

Triggers when a new custom event is created in Deadline Funnel. This can be used to react to events tracked within campaigns.

### New ConvertHub Opt-in Form Submission

Triggers when a new subscriber submits a ConvertHub opt-in form.

Note: These outbound event triggers appear to be available through Zapier's polling mechanism rather than native webhooks sent by Deadline Funnel. Deadline Funnel does not appear to offer a native outbound webhook configuration through its own API for arbitrary event subscriptions.
