# Slates Specification for Chmeetings

## Overview

ChMeetings is a cloud-based church management software (ChMS) used by faith-based organizations to manage members, groups, events, contributions, communications, volunteer scheduling, and accounting. It is an all-in-one platform designed to support churches at every stage, allowing them to track members and attendance, organize events and groups, communicate with their congregation, accept online donations, manage church accounting, and plan worship services.

## Authentication

ChMeetings uses **API Key** authentication.

To obtain an API key, go to Settings > Integrations > API Integration and click on "Get API". Your API Key will be generated.

The API key must be passed in the `ApiKey` header on each request:

```
ApiKey: your-api-key-here
```

The base URL is `https://api.chmeetings.com` and all endpoints are under `/api/v1/`.

Access to the API Key means access to your data, so the key should be kept private and only shared with authorized individuals. Changing the API Key will disable all apps using the current key; they must be updated with the new key.

The API is only available starting with the Growth Plan.

## Features

### Organizations & Ministries Management

Retrieve the hierarchical structure of your church account. You can list all ministries under the church and retrieve all organizations accessible by the API key. ChMeetings uses a hierarchical account structure (Church, Ministries, and Groups) for organization and security.

### People Management

Pull people-related data from ChMeetings, including profile details. You can retrieve (GET) and delete (DEL) people records. Native Names are included as part of the People API.

### Profile Notes

Manage data related to profile notes, including retrieving and deleting profile notes.

### Family Management

Manage family structures including retrieving family roles, creating and retrieving families, managing family IDs, and adding, updating, or removing family members.

### Groups

Retrieve groups data from ChMeetings. Groups can be filtered and organized by various criteria within the church hierarchy.

### Contributions (Giving)

Pull and push contributions data from/to ChMeetings. This is the only resource that supports both read and write operations, allowing external systems to record donations back into ChMeetings.

### Pledges & Campaigns

Pull pledges and campaigns from ChMeetings. Pledges allow you to collect and track information about donation amounts that members want to make, including pledge campaigns, member pledges, and progress of paid amounts compared to pledged amounts. This is read-only via the API.

## Events

ChMeetings supports webhooks for real-time notifications.

Webhooks are configured under Settings > Integrations > Webhooks by clicking "Add Webhook" and entering an Endpoint URL where notifications should be sent. You then select the events to listen to. Each webhook has a Secret Key that can be used to verify that calls are coming from ChMeetings.

### People Events

Notifications are sent when People are created, updated, or deleted. You can subscribe to any combination of these actions.

### Contribution Events

Notifications are sent when Contributions are created.
