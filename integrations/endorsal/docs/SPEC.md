Now let me check the API docs for more details on endpoints and features:Now let me look at the Make.com integration for more details on available modules and the Zapier triggers:Now I have sufficient information. Let me compile the specification.

# Slates Specification for Endorsal

## Overview

Endorsal is a testimonial and review management platform that automates the collection, management, and display of customer testimonials and reviews. It provides tools for sending automated review request campaigns (via email and SMS), importing reviews from external platforms (Google, Facebook, Yelp, Tripadvisor, etc.), and embedding testimonial widgets on websites.

## Authentication

Endorsal uses API key-based authentication, with the API key passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <api_key>
```

The base URL for API requests is `https://api.endorsal.io/v1`.

To generate API credentials, go to the API page on your Endorsal dashboard and select the property for which you want to generate an API key. Click your profile icon > API > Generate new API key, then copy the key.

API keys are property-specific, meaning a property is a unique domain on which the embed code is installed and for which testimonials are collected. You will need a separate API key for each property you wish to access.

## Features

### Contact Management

The API allows you to create, retrieve, update, list, and archive contacts in your Endorsal account. Contacts serve as Endorsal's CRM, allowing you to manage customer records that are used in review request campaigns. Contacts support custom attributes to track dynamic properties or events and sync with other CRM or marketing software.

### Testimonial Management

You can list, create, retrieve, update, and delete testimonials. When creating a testimonial, you can submit feedback along with the customer's name, email, company, job title, and star rating. Testimonials can be retrieved by ID or filtered by tag to find reviews relevant to a specific product or service. You can also retrieve all testimonials associated with a specific contact.

### AutoRequest Campaigns

The API provides access to list AutoRequest campaigns and fetch details for a specific campaign by ID, including delivery stats and configuration. AutoRequests are automated testimonial generation campaigns that send customers review requests via email and SMS at the right time.

- Campaigns can be filtered by custom attribute rules for targeted outreach.
- AutoRequests includes campaign data such as open & click rates and new reviews.

### Widgets

You can fetch all Endorsal widgets, showing their configuration and status, to verify social proof placement on your site.

### SuperLinks

You can create unique SuperLinks based on customer data of your choice. SuperLinks are pre-filled review form URLs that reduce friction for customers by populating forms with data you already hold on them.

## Events

Endorsal supports webhook-based event notifications via integrations with platforms like Zapier and Make.

### New Testimonial

- Triggers when a new testimonial is submitted to your property.
- This is the primary event type available, enabling you to react to incoming testimonials in real time (e.g., forward to Slack, sync with a CRM, trigger approval workflows).
