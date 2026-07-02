Now let me fetch the full API docs to get more details on features and webhooks:Now I have comprehensive information. Let me compile the specification.

# Slates Specification for Beaconstac

## Overview

Beaconstac (now rebranded as Uniqode) is a platform for creating, managing, and tracking QR codes, NFC tags, BLE beacons, geofences, and digital business cards. It provides tools for proximity marketing campaigns, lead capture through forms and landing pages, and scan analytics across all product types.

## Authentication

The Beaconstac API uses API key to authenticate requests. All API requests must be made over HTTPS. Calls made over plain HTTP will fail. API requests without authentication will also fail.

**Obtaining the API key:**

You can find your developer token by using the following steps: Login to the Beaconstac dashboard. Go to your 'Account' section using the drop-down on the top-right. In the 'Account Details' section, copy the 'Developer Token' value.

Note: You will also need your Organization ID for organization-specific API requests. Users need the Organization ID to have multi-user access management functionality. This is necessary to make organization-specific API requests.

**Using the API key:**

Include the API key in the `Authorization` header of every request:

```
Authorization: Token YOUR_TOKEN
```

The base URL for the API is `https://api.beaconstac.com/api/2.0/`.

## Features

### QR Code Management

Create, retrieve, update, and list both static and dynamic QR codes. Dynamic QR codes allow changing the destination or campaign after deployment. QR codes can be downloaded in multiple formats (PNG, JPG, SVG, PDF) at configurable sizes. Each QR code can be associated with a campaign (URL redirect, landing page, form, etc.) and assigned to a place.

- **Parameters:** Name, QR type (static/dynamic), organization, place, visual attributes (color, logo, background image, margin), and campaign association.
- QR codes can be customized with brand colors, logos, and background images.

### Bulk QR Code Creation

Create collections of multiple QR codes in a single request by uploading a CSV file. Useful for generating large batches of QR codes at once.

- Bulk collections can be listed, retrieved, and downloaded.

### Campaign Management

Campaigns define the content or action triggered when a QR code, NFC tag, beacon, or geofence is engaged. Supported campaign types include:

- **Custom URL** – Redirects to a specified URL.
- **Landing Pages** – Mobile-friendly pages built with HTML/Markdown/CSS, with theming support.
- **Feedback Forms** – Structured forms for collecting user information (surveys, lead capture, etc.). Form responses can be retrieved via the API.
- **App Links** – Redirect to App Store or Play Store based on the user's device OS.
- **vCard Plus** – Digital contact cards with name, phone, email, address, and customization options.
- **Social Media** – Landing pages linking to social media profiles.
- **Coupon** – Coupon code campaigns with expiry dates and Apple Wallet pass support.
- **Business Card** – Business detail pages with contact info, open hours, and CTA buttons.
- **PDF, Restaurant Menu, Phone, SMS, Email** – Additional specialized campaign types.

Campaigns support scheduling with start/end dates and optional age gates.

### NFC Tag Management

List, retrieve, and update NFC tags. Each NFC tag is associated with a campaign and place. Tags track scan counts via a hardware counter.

- NFC tags cannot be created via the API; they are provisioned through Beaconstac hardware.

### Beacon Management

List, retrieve, and update BLE beacons. Beacons support iBeacon (UUID/major/minor) and Eddystone protocols. Each beacon can be associated with a campaign, campaign notifications (multi-language), and a physical place.

- Beacons report battery level, temperature, and heartbeat timestamps.
- Beacons cannot be created via the API; they are provisioned through hardware.

### Geofence Management

Create, list, retrieve, and update geofences. Geofences define circular geographic areas (latitude, longitude, radius) that trigger campaigns when users enter the zone.

- **Parameters:** Name, latitude, longitude, radius, place, and campaign association.
- Geofences support multi-language campaign notifications.

### Places

List and view places (physical locations) in your account. Places are associated with Google Place IDs and serve as organizational containers for beacons, NFC tags, QR codes, and geofences.

### Analytics

Retrieve analytics data for beacons, NFC tags, QR codes, and geofences, including:

- **Overview** – Aggregate notification and impression counts per product.
- **Performance** – Time-series data with configurable intervals and timezones, including notification counts, impression counts, and click-through rates.
- **Impression Detail** – Individual impression records with timestamps, IP addresses, and user agents.
- **Impression Distribution** – Breakdown of impressions by place and product, categorized by campaign type (custom URL, landing page, form).
- **CSV Export** – Generate detailed CSV reports emailed to a specified address.

Analytics queries require a time range specified in epoch milliseconds.

### File Uploads

Upload files (e.g., images, PDFs) to your Beaconstac account for use in campaigns and QR code designs.

## Events

Beaconstac supports webhooks that notify you when someone creates, updates, views, or deletes a QR Code (or any other event). Based on integration platform data, the following event triggers are available:

### QR Code Scanned

- Triggers when a QR Code is scanned.
- Provides scan data including the QR code identifier and scan context.

### New Contact / Lead Created

- Triggers when a new contact is created in your Beaconstac account.
- Fires when a user submits their information through a QR code campaign or digital business card interaction.

### New Form Response

- Triggers when a new form response is submitted.
- Fires instantly when a user completes a feedback form linked to a campaign.

Note: Webhook configuration details are not extensively documented in the public API reference. Webhook setup may be primarily available through third-party integration platforms (Zapier, Make) or the Beaconstac dashboard rather than through direct API-based webhook registration.
