Based on my research, I now have enough information to write the specification. The search results for webhooks didn't return any Mailsoftly-specific webhook documentation, indicating Mailsoftly likely doesn't support webhooks natively through its API.

# Slates Specification for Mailsoftly

## Overview

Mailsoftly is an email marketing and automation platform that enables businesses to create, send, and track email campaigns. The API provides a comprehensive interface for managing contacts, contact lists, and tags associated with firms. The platform offers features including personalized email campaigns, contact segmentation, email templates, email automation, A/B testing, and an email parser.

## Authentication

Mailsoftly uses API keys for authentication.

The authentication is used to validate the API key provided in the request headers. It ensures that the API request is coming from an authorized source by verifying the API key associated with a specific firm.

To authenticate, include the API key in the `Authorization` header of every request:

```
Authorization: <your_api_key>
```

The base URL for the API is `https://app.mailsoftly.com/api/v3/`.

Upon successful authentication, the `/authentication` endpoint returns basic information about the firm, including the firm ID, firm name, and the name of the admin user. This endpoint is typically called at the start of a session or interaction to verify that the API key is valid before proceeding with any further operations.

If the API key is invalid or missing, the request will be denied, and an authentication error will be returned.

## Features

### Contact Management

Create, retrieve, update, and search contacts associated with a firm. You can create a new contact by providing first name, last name, and email address. You can also create a new contact or update an existing one in a single operation. Contacts can be fetched with a basic or detailed view using the `type` parameter. Contacts can be searched based on specified search criteria.

- Custom fields can be used to store information beyond the standard contact structure (like first name and last name), allowing for the addition of custom information relevant to the contact.
- You can also fetch all contact fields available for a firm.

### Contact Lists

Organize contacts into lists for targeting email campaigns. You can retrieve all contact lists associated with a firm, fetch details of a specific contact list, create new contact lists, and retrieve all contacts within a specific contact list.

- You can add an existing contact to a specific contact list.
- You can also add one or more contacts to a contact list in bulk.

### Tags

Retrieve a list of all tags associated with the authenticated firm. Tags can be created with a name and tag color. Tags are useful for categorizing contacts by behavior, interests, or other attributes.

### Email Campaigns

Retrieve a list of email campaigns. The API accepts either a single email object or an array of emails via the `mailLists` key.

- Subject is required, and either a `contact_list_id` or `recipients` must be provided.
- If `contact_list_id` is not provided, the system will create a contact list using the provided recipients. Attachments must be public URLs.
- A maximum of 5 attachments per email, and attachments must be valid public URLs.

### Email Drafts and Sending

You can fetch the status of a specific email draft by its ID, which returns whether the draft is ready to send and its current status. You can send an existing email draft if it is marked as ready.

## Events

The provider does not support events. Based on available documentation, Mailsoftly's API does not offer webhooks or purpose-built event subscription mechanisms.
