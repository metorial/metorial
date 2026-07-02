# Slates Specification for GTmetrix

## Overview

GTmetrix is a web performance testing service that analyzes page load speed using Lighthouse and legacy PageSpeed/YSlow engines. It provides detailed performance metrics, scores, and optimization recommendations for any given URL. The API allows programmatic testing from multiple global locations and browsers, with access to reports, HAR files, screenshots, and other test artifacts.

## Authentication

GTmetrix uses HTTP Basic Access Authentication. The API key is used as the username, and the password is left blank.

- **Method:** HTTP Basic Authentication
- **Username:** Your GTmetrix API key
- **Password:** (empty)
- **Base URL:** `https://gtmetrix.com/api/2.0/`

You can generate and view your API key in your GTmetrix Account Settings page. An API key is needed to use the GTmetrix REST API or the GTmetrix for WordPress plugin.

Example using cURL:

```
curl -u YOUR_API_KEY: https://gtmetrix.com/api/2.0/status
```

If you are accessing the API using an API key generated from a GTmetrix Team plan with a role of Viewer, you will not be able to generate tests, delete reports/pages or create PDF reports.

## Features

### Performance Testing

Run page speed tests on any URL. The API provides an easy way to utilize GTmetrix's performance testing service, allowing you to integrate performance testing into your development environment or application. Tests can be configured with:

- **Report type:** Lighthouse (default), Legacy (PageSpeed/YSlow), both, or metrics-only.
- **Test location:** Choose from multiple global server locations.
- **Browser:** Select from available browsers (e.g., Chrome desktop or Android).
- **Simulated device:** Test with device-specific viewport sizes, user agents, and pixel ratios (PRO only).
- **Connection throttling:** Simulate various network conditions (e.g., Broadband, LTE, 3G).
- **AdBlock:** Enable ad blocking during the test.
- **Cookies:** Supply custom cookies for the test.
- **HTTP authentication:** Provide credentials for password-protected pages.
- **URL filtering:** Allow or block specific resource URLs during loading.
- **Custom DNS, user agent, and viewport settings** (PRO only).
- **Video capture:** Record a video of the page load.
- **Report retention:** Choose how long reports are kept (1, 6, 12, or 24 months).

Tests are asynchronous — you start a test and poll for completion.

### Reports & Metrics

Retrieve detailed performance reports after test completion. Reports include:

- GTmetrix grade and score, performance score, and structure score.
- Core Web Vitals: Largest Contentful Paint, Total Blocking Time, Cumulative Layout Shift.
- Timing metrics: TTFB, First Contentful Paint, Speed Index, Time to Interactive, DOM timings, fully loaded time, and more.
- Page weight and request count.

### Report Resources

Download various artifacts from a completed report:

- **HAR file:** Full network waterfall data including resource usage (CPU, memory, bandwidth).
- **Screenshots:** Page screenshot at load completion.
- **Filmstrip:** Frame-by-frame screenshots captured during page load (Lighthouse reports).
- **Video:** MP4 recording of the page load (if enabled).
- **PDF reports:** Standard or full GTmetrix report in PDF format.
- **Lighthouse JSON:** Full Lighthouse report compatible with the Lighthouse Report Viewer.
- **Legacy reports:** PageSpeed and YSlow JSON data, plus optimized files archive.
- **Optimized images:** Downloadable archive of optimized image assets (available for 24 hours).

### Page Management

A page is an aggregation of reports sharing the same URL and analysis options settings. You can:

- List, retrieve, and delete pages (similar to the GTmetrix Dashboard).
- Fetch the latest report or a historical list of reports for any page.
- Retest a page using its existing analysis options.
- Filter and sort pages by URL, monitoring status, location, browser, and report attributes.
- View whether a page is monitored (hourly, daily, weekly, or monthly).

### Test Configuration Discovery

Query available test infrastructure:

- **Locations:** List all available test server locations with region, IP addresses, and supported browsers.
- **Browsers:** List available browsers with their supported features (AdBlock, video, Lighthouse, throttling, etc.).
- **Simulated devices:** List all device presets with screen dimensions, DPR, and user agents (PRO only).

### Account Status

Retrieve current account details including API credit balance, next credit refill time, refill amount, account type, and feature access flags (PRO analysis options, PRO locations, white-label PDF access).

## Events

The provider does not support events. GTmetrix does not offer webhooks or event subscription mechanisms. Test completion must be determined by polling the test status endpoint.
