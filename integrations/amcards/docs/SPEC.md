Let me try to access the AMcards API documentation directly and the Zapier integration page for more details on available actions.Now I have a comprehensive view of the AMcards API from the Zapier integration page. Let me compile the specification.

# Slates Specification for Amcards

## Overview

AMcards is a platform that enables businesses to create and send personalized physical greeting cards and gifts to clients, employees, and partners. The AMcards API allows you to automate the process of sending physical greeting cards. Users can create drip campaigns and automate cards for birthdays, anniversaries, holidays, referrals, and specific dates.

## Authentication

AMcards uses API keys for authentication. The API key is passed as a Bearer token in the `Authorization` header of requests.

- **Base URL:** `https://amcards.com/.api/v1/`
- **Header:** `Authorization: Bearer <API_KEY>`

The API key can be obtained from your AMcards account settings. Amcards requires you to configure your own API key credentials.

## Features

### Send Individual Cards

Create and send personalized physical greeting cards to recipients. A card requires selecting a Quicksend Template and providing recipient and sender address details (name, address, city, state, postal code). Optional parameters include a custom message, a scheduled send date, and a third-party contact ID for linking to external CRM records.

- Templates are pre-configured in the AMcards platform and referenced by ID.
- The "Initiator" field is required to identify who triggered the card send.
- Cards are physically printed, stuffed, and mailed by AMcards.

### Schedule Drip Campaigns

Create drip campaigns or use pre-built ones to send a series of cards to a recipient over time. Campaigns are pre-configured in the AMcards platform and triggered via the API with recipient details.

- Supports additional recipient fields like salutation, birth date, phone number, and anniversary date, which can be used for personalization within the campaign.
- Optional "FROM" address fields allow overriding the default sender.
- A send date can be specified to schedule when the campaign starts.
- A third-party contact ID can be provided for external system tracking.

### Cancel Cards by Contact

Cancels all editable cards related to the specified contact. This uses the third-party contact ID to identify which contact's pending cards should be cancelled.

- Only cards that are still in an editable state (not yet printed/mailed) can be cancelled.

### Contact Management

The API can query contacts in real-time, searching by email, first name, or last name. Results include all stored contact fields — names, addresses, and timestamps.

### Card Retrieval

Retrieve your complete card history through the API. This includes all cards associated with your account — queued, printed, mailed, or delivered.

### User Account Information

Retrieve information about the authenticated user account via the user endpoint.

## Events

The provider does not support events. AMcards does not offer webhooks or event subscription mechanisms through its API. Integrations typically rely on external triggers (e.g., from CRM systems or scheduling tools) to initiate AMcards actions rather than AMcards emitting events.
