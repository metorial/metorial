Now let me fetch the configuration page to get more details on API key scopes:# Slates Specification for Gosquared

## Overview

GoSquared is a web analytics and customer engagement platform that provides real-time website analytics, a People CRM for tracking and segmenting users, live chat (called GoSquared Assistant), and ecommerce tracking. It offers APIs for sending tracking data into the platform and retrieving both real-time and historical analytics data.

## Authentication

GoSquared uses API key-based authentication. Two credentials are required for most API operations:

- **API Key** (`api_key`): A key associated with your user account. Generated from Settings > Your Account > API Access in the GoSquared dashboard. API Keys are associated to Users, not to projects.
- **Site Token** (`site_token`): The project token identifying the specific GoSquared project you are working with. Found under Settings > Current Project > General. It should look something like `GSN-123456-A`.

Both parameters are passed as query parameters on API requests (e.g., `?api_key=YOUR_KEY&site_token=YOUR_TOKEN`).

### API Key Scopes

When creating an API key, you assign scopes that control which parts of the API the key can access:

- `read_ecommerce` – Read historical Ecommerce data from the Ecommerce API. Powers the Ecommerce dashboard.
- `read_account` – Read account related data from the Account API.
- `write_account` – Write to the Account API, such as creating new sites or adding new shared users.
- `write_tracking` – Write to the Tracking API. This enables event tracking and much more from any application.

Additional read scopes exist for `read_now` (real-time data) and `read_trends` (historical data), corresponding to the Now and Trends APIs respectively.

## Features

### Real-Time Analytics (Now API)

The Now API provides real-time concurrent information about your sites and apps, such as the number of concurrent visitors online, the most popular pages right now, the most influential traffic sources, and much more. Data dimensions include browsers, campaigns, countries, engagement, geo-location, languages, organisations, platforms, sources, pages, and visitor details.

### Historical Analytics (Trends API)

The Trends API provides historical analytics information for any given period in a project's history. The data for the current period updates in real-time, so the figures are always fresh and up-to-date. You can retrieve aggregate data broken down by browser, campaign (name/source/medium/content/term), country, event, language, organisation, OS, page, path, screen dimensions, and traffic sources. Date range filtering is supported via `from` and `to` parameters.

### User Tracking and Identification (Tracking API)

The Tracking API allows you to track your users on any platform or device. Key capabilities include:

- **Identify**: Associate users with profile data (name, email, phone, company info, and custom properties).
- **Events**: GoSquared events are a versatile way of tracking anything that is happening on your site or app. User actions, application errors, state transitions, and activity of all kinds can be tracked as an event.
- **Pageviews**: Track page visits server-side.
- **Transactions**: Track ecommerce transactions with revenue, quantity, and item details.
- Each GoSquared project can track up to 1000 custom events. Above this limit, events with new names will be ignored.

### People CRM (People API)

The People API provides the data for People and powers its searching and grouping functionality. You can use the People API to access all of the Smart Groups you have configured or create your own filters and queries using the power of People's search. Features include:

- The `/people` endpoint gives you access to all of your tracked users. You can filter and search through them as well as access them individually via their ID.
- Retrieve all the information and data about a specific user, including their full timeline of activity, as well as all the properties stored against that user.
- Create and retrieve Smart Groups.
- Retrieve tracked devices, event types, and custom property types.

### Live Chat (Chat API)

You can use the Chat API to take control of the GoSquared Assistant as well as retrieve chat data for reporting purposes. Message a website visitor as an agent. Also gives the ability to send a message to an agent from an identified client. Leave a note from an agent on a client conversation. You can also retrieve active and archived chat conversations, list messages within a conversation, and archive/un-archive chats.

### Account Management (Account API)

Read account related data from the Account API. Write to the Account API, such as creating new sites or adding new shared users. You can also manage blocked visitors, tagged visitors, trigger types, and webhooks programmatically.

## Events

GoSquared supports webhooks that can be configured to fire on notification triggers. Webhooks can be used to build custom integrations. Anything that would normally trigger a notification, can be used to post a webhook to a specified URL.

Webhooks can be managed both via the UI (Settings > Current Project > Integrations) and programmatically via the Account API (create, list, delete webhooks and manage triggers).

### Smart Group Membership Changes

User enters/exits a Smart Group – payload contains the full profile info and the name of the group they entered/exited. This allows triggering workflows when users match or stop matching specific segmentation criteria (e.g., new signups, high-value users).

- You can configure the boundary as `enter` or `exit`.
- The payload includes the person's full profile data and the Smart Group details.

### Traffic Spike/Dip Alerts

Traffic Spike/Dip – payload contains the number of visitors currently on your site and a summary of your site's traffic info.

- Triggered when concurrent visitor counts cross configured thresholds.
- Payload includes concurrent visitor count and a snapshot of site traffic data.

### Live Chat Messages

New live chat message – payload contains the chat message and profile information about the user who sent it.

- Triggered when a visitor sends a new message through the GoSquared Assistant.
- Payload includes the message content, timestamp, and the sender's profile information.
