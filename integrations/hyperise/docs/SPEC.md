# Slates Specification for Hyperise

## Overview

Hyperise is a hyper-personalization platform that enables users to create dynamically personalized images, videos, and website content tailored to individual recipients. The Hyperise API lets you dynamically personalize images with user-specific data, making it easier to create tailored visual content for each recipient. It is commonly used in marketing campaigns, sales outreach, and email personalization workflows.

## Authentication

Hyperise uses API keys for authentication. The API token is generated from your Hyperise account settings. This single token authenticates all API requests. No additional passwords or OAuth flows are needed. You can revoke and regenerate the token anytime.

To authenticate, the API token is passed as a query parameter: `https://app.hyperise.io/api/v1/regular/...?api_token=<your_token>`.

You can verify authentication by calling the User Authentication endpoint at `https://app.hyperise.io/api/v1/regular/users/current` with the `api_token` parameter.

## Features

### Image Template Management

List all active image templates for the authorised user. Templates are identified by a unique hash and can include dynamic personalization layers. Hyperise supports dynamic text layers for first name, last name, company name, job title, phone, website, and address. It also supports dynamic image layers for profile photos, company logos (resolved from domain), website screenshots, and up to three custom images. QR codes can be personalized per prospect as well.

### Prospect Business Data Management

The Business Data API enables full CRUD controls of business prospect data within Hyperise. Adding a record via the API will return a record ID, which can then be used to apply that data to any Hyperise image. Prospect records include fields such as business name, address, phone, email, website, logo, personal details (name, gender, job title), and profile image.

### Personalised Short Links

Create personalized short URLs that embed dynamic image previews. It returns a unique short link with Open Graph metadata that shows a personalized image preview when shared. Required parameters include an image template hash, destination URL, page title, and page description. Optional personalization data includes first name, last name, profile image URL, job title, company name, and more.

### Data Enrichment

This API endpoint provides enriched data from an email input, with fallback data from a defined image template. This API endpoint is intended to be used to ingest enriched email data into other platforms. Company data enrichment includes email/domain to logo, basic company details enrichment and website screenshots. Person data enrichment includes email to profile image, first/last name, company related details such as job title and enhanced company details.

### Image Impressions Tracking

List the most recent personalised impressions for selected image. This allows tracking when personalized images are viewed by recipients. Results can be filtered by image template hash and date range.

### Client Account Management (Agency)

For agencies using Hyperise at scale, the agent provisions new client sub-accounts by calling the Create Client Account endpoint with the business ID, client name, and email. This feature is available on Agency and White Label plans.

## Events

The provider does not support webhooks or built-in event subscriptions. The Image Impressions/Views API can be used as a polling mechanism to detect when personalized images have been viewed, filtered by image template hash and date, but this is a standard API polling pattern rather than a purpose-built event system.
