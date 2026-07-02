Now I have enough information to write the specification.

# Slates Specification for Niftyimages

## Overview

NiftyImages is an email marketing tool that generates dynamic, personalized images, countdown timers, and data-driven content for use in emails, landing pages, and websites. It lets you personalize and change images so each recipient sees the most relevant message. It allows users to create and customize data-driven content, then use them in emails, mobile in-app messages, landing pages, or websites.

## Authentication

A valid API Key is required for every request. There are three different ways to pass the API Key.

The API Key can be obtained from the NiftyImages account under **Settings > Integration/Plugins > API**. If you don't have an API key already, create a new one. Otherwise, copy your existing API key.

The three methods to provide the API Key are:

1. **HTTP Header**: Pass the key as a custom header.
   - Header name: `ApiKey`
   - Header value: `YOUR_API_KEY`

2. **Query String**: Append the key as a query parameter.
   - Parameter: `ApiKey=YOUR_API_KEY`

3. **HTTP Basic Authentication**: The username field can be any dummy value, and the password should be the API Key. The combined string `username:API_KEY` is then Base64-encoded and sent via the `Authorization: Basic` header.

Base URL: `https://api.niftyimages.com/v1/`

## Features

### Data Store Management

Data Stores allow you to pass in real-time data via the API to always display the latest content. You can design custom images that showcase the newest content for subscribers each time the image is loaded, including text, images, and links that create evergreen content. The API supports getting store fields, adding new records, and deleting records (by ID or by matching criteria).

- You can change offers, products, or modify content on emails that have already been sent, no matter what email platform you are using.

### Timer Management

A countdown timer is a dynamic image that counts down to a particular event. It updates every time a user re-opens an email. You can select a date, time, and timezone when the countdown expires. The API allows updating a timer's target date programmatically.

- Timers can be personalized per subscriber using merge tags with unique dates.
- Along with addHours, you can use addMinutes to dynamically adjust your timer.

### Map and Location Management

The Maps feature allows you to custom design your map, import a list of locations, and make a few quick selections to complete your map. The API supports full CRUD operations on map locations: retrieving all maps, getting map details, searching for locations, adding/updating/deleting locations.

- You can detect a subscriber's location and show them your nearest store.
- Each location on a Map can have its own unique icon.
- Configurable search radius for nearest-location detection.

### Image Management

The API allows you to page through all images in your account, retrieve aggregated stats (impressions) for images, get individual image details, and delete images. This enables tracking performance of personalized images and countdown timers.

- Stats can be filtered by date range using `startDate` and `endDate` parameters.

### Photoshop Image Management

Personalizing Photoshop files allows you to have multiple variables inside of a single image, each with their own font/size/color, positioning and text effects. The API allows you to retrieve layer details for a Photoshop-based image and update Photoshop image layers programmatically.

- You can show or hide Photoshop Layers based on Data Source values, and set the color of Text Layers and Shape Layers based on Data Source values.

### Widget and User Management

With the NiftyImages API you can query widget/user/image stats enabling an automated way to sync data or pass on impression costs to your widget users. The API supports listing all widgets, retrieving widget stats, listing users per widget, getting per-user stats, and suspending users.

- Useful for ESP (Email Service Provider) integrations that embed NiftyImages tools via a JavaScript widget.

### Chatbot Integration

The API provides dedicated endpoints for ManyChat and ChatFuel integrations, allowing dynamic image generation within chatbot flows.

## Events

The provider does not support events. There is no documented webhook or event subscription mechanism in the NiftyImages API.
