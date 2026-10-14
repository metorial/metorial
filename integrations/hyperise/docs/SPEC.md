# Hyperise Integration Specification

## Overview

Hyperise is a hyper-personalization platform that enables users to create dynamically personalized images, videos, and website content tailored to individual recipients. The Hyperise API lets you dynamically personalize images with user-specific data, making it easier to create tailored visual content for each recipient. It is commonly used in marketing campaigns, sales outreach, and email personalization workflows.

## Authentication

Hyperise uses API keys for authentication. The API token is generated from your Hyperise account settings. This single token authenticates all API requests. No additional passwords or OAuth flows are needed. You can revoke and regenerate the token anytime.

To authenticate, the API token is passed as a query parameter: `https://app.hyperise.io/api/v1/regular/...?api_token=<your_token>`.

You can verify authentication by calling the User Authentication endpoint at `https://app.hyperise.io/api/v1/regular/users/current` with the `api_token` parameter.

## Features

### Connected User Identity

The `get_current_user` tool calls the read-only User Authentication endpoint to identify the connected user. It returns the user ID, name, email, profile photo URL, image service domain, application URL, and creation timestamp when provided by Hyperise.

### Image Template Management

List all active image templates for the authorised user. Templates are identified by a unique hash and can include dynamic personalization layers. Hyperise supports dynamic text layers for first name, last name, company name, job title, phone, website, and address. It also supports dynamic image layers for profile photos, company logos (resolved from domain), website screenshots, and up to three custom images. QR codes can be personalized per prospect as well.

### Prospect Business Data Management

The Business Data API enables full CRUD controls of business prospect data within Hyperise. Adding a record via the API will return a record ID, which can then be used to apply that data to any Hyperise image. Prospect records include fields such as business name, address, phone, email, website, logo, personal details (name, gender, job title), and profile image. Create and update also accept the documented `custom_text_1` through `custom_text_4` values as `customText1` through `customText4`.

### Personalised Short Links

Create personalized short URLs that embed dynamic image previews. It returns a unique short link with Open Graph metadata that shows a personalized image preview when shared. Required parameters include an image template hash, destination URL, page title, and page description. Optional personalization data includes first name, last name, profile image URL, job title, company name, and more.

### Data Enrichment

This API endpoint provides enriched data from an email input, with fallback data from a defined image template. Hyperise documents both the email and image template hash as required. Supply `imageTemplateHash` from `list_image_templates` when enriching a contact. This API endpoint is intended to be used to ingest enriched email data into other platforms. Company data enrichment includes email/domain to logo, basic company details enrichment and website screenshots. Person data enrichment includes email to profile image, first/last name, company related details such as job title and enhanced company details.

### Image Impressions Tracking

List the most recent personalised impressions for selected image. This allows tracking when personalized images are viewed by recipients. Results can be filtered by image template hash and starting date. When `dateFrom` is omitted, Hyperise returns views since the previous API call.

### Client Account Management (Agency)

The `create_client_organization` tool provisions new client sub-accounts at the documented `/organizations` endpoint with a client name, invitation email, and seat count. Hyperise sends an invitation email after creation. This feature is available on Agency and White Label plans. The deprecated `create_client_account` tool remains available with its existing business ID, name, and email inputs for existing workflows.

## Events

The provider does not support webhooks or built-in event subscriptions. The Image Impressions/Views API can be used as a polling mechanism to detect when personalized images have been viewed, filtered by image template hash and date, but this is a standard API polling pattern rather than a purpose-built event system.

## Official API References

- [API token setup](https://hyperise.customerly.help/en/articles/9936-Creating-API-token)
- [User Authentication API](https://hyperise.customerly.help/en/articles/9940-User-Authentication-API)
- [List Image Templates API](https://hyperise.customerly.help/en/articles/9935-List-Image-Templates-API)
- [Prospect Business Data API](https://hyperise.customerly.help/en/articles/9938-Prospect-Data-API)
- [Personalised Short Links API](https://hyperise.customerly.help/en/articles/9937-Personalised-Short-Links-API)
- [Data Enrichment API](https://hyperise.customerly.help/en/articles/9941-Data-Enrichment-API)
- [Image Views API](https://hyperise.customerly.help/en/articles/9939-Image-Views-API)
- [Create client account API](https://hyperise.customerly.help/en/articles/10000-create-client-account-api)
