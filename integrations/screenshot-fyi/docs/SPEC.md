Let me fetch the API documentation page for more details.The page didn't render much content. Let me check the Pipedream integration for more details on the API parameters.# Slates Specification for Screenshot.fyi

## Overview

Screenshot.fyi is a screenshot API service that captures high-quality screenshots of any website via a single API call. It supports configurable viewport sizes, full-page captures, dark mode, and automatic removal of cookie banners and popups.

## Authentication

Screenshot.fyi uses **API Key** authentication.

- The API is called by passing an `accessKey` query parameter to the endpoint: `https://screenshot.fyi/api/take?accessKey=YOUR_API_KEY&url=https://example.com`.
- The API Key can be found on the top right of the dashboard when logged in.
- An account can be created at `https://www.screenshot.fyi/register`.

## Features

### Website Screenshot Capture

Take screenshots of any website with a single API call. The API endpoint is `https://screenshot.fyi/api/take` and accepts the target URL as a required parameter.

Configurable options include:

- **Full Page**: Capture entire web pages from header to footer using the `fullPage` parameter (boolean).
- **Custom Viewport Size**: Take screenshots at any viewport size, from mobile devices to widescreen displays, using `width` and `height` parameters (in pixels).
- **Dark Mode**: Capture websites in both light and dark modes using the `darkMode` parameter (boolean, defaults to `false`).
- **Cookie Banner Removal**: Automatically remove unwanted elements like cookie banners, popups, and chat widgets using the `disableCookieBanners` parameter (boolean, defaults to `true`).
- **Output Format**: Choose the format of the screenshot — supported formats are `png`, `jpg`, and `jpeg` (defaults to `jpg`).

The API returns a JSON response containing a URL to the captured screenshot image.

## Events

The provider does not support events.
