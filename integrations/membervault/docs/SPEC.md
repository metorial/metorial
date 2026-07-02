Now let me check the Zapier page for MemberVault to get the full list of triggers and actions.Now I have a comprehensive picture. Let me also check the Zapier page more carefully for the complete list of triggers and actions. From the Zapier page I can see the full list of MemberVault triggers and actions. Let me also check for the additional triggers mentioned by Pabbly (account created, first log in).

# Slates Specification for Membervault

## Overview

MemberVault is a platform for hosting and delivering online courses, memberships, and digital products. It provides user management, engagement tracking (via an "Engagement Points" system), Stripe payment integration, and connects with email marketing services. It is primarily used by creators and entrepreneurs to manage digital content delivery and track audience engagement.

## Authentication

MemberVault uses **API key authentication**. All API requests are authenticated by passing the API key as a query parameter.

**Required credentials:**

- **API Key**: A unique key per account. Found in the MemberVault admin under **Integrations → Other**, in the "Webhooks API" section.
- **Account Subdomain**: The subdomain portion of your MemberVault URL. For example, if your URL is `https://mybusiness.vipmembervault.com`, the subdomain is `mybusiness`. Some accounts may use the newer `mvsite.app` domain format (e.g., `https://mybusiness.mvsite.app`).

**How it works:**

All API calls use GET requests with the API key appended as a query parameter:

```
https://{subdomain}.mvsite.app/api/{endpoint}?apikey={your_api_key}
```

Additional parameters are appended as GET query parameters (e.g., `&email=user@example.com&course_id=109`).

There is no OAuth flow, token refresh, or scoping mechanism. The single API key provides full access to the account's API capabilities.

## Features

### Product (Course) Management

Retrieve a list of all products (referred to as "courses" in the API) within an account. Returns product data in JSON format including product IDs needed for user management operations.

- No additional parameters required beyond authentication.
- Products in MemberVault encompass courses, memberships, digital downloads, and any other offer types.

### User Management

Add users to products, remove users from products, or completely delete users from an account.

- **Add user to product**: Creates a user account (if one doesn't already exist) and grants access to a specified product. Requires email and product ID; first name and last name are optional. Passing `-1` as the product ID adds the user without granting product access.
- **Remove user from product**: Revokes a user's access to a specific product without deleting the user account. Requires email and product ID.
- **Delete user**: Permanently deletes a user and all their data (progress, quiz answers, etc.) from the account. This action is irreversible. Requires only the user's email.
- Duplicate users are not created; if a user with the same email already exists, they are simply granted access to the new product.

### Outbound Webhooks via Actions

MemberVault's "Actions" feature allows sending outbound webhook calls (HTTP POST with user data in JSON) to external endpoints when specific events occur within the platform.

- Configured within the MemberVault admin under the Actions page.
- Triggers can be based on events like a user being added to a product, completing a lesson, earning engagement points, etc.
- The webhook payload includes the user's information (email, name, etc.).
- This is a built-in feature of MemberVault, not part of the REST API.

## Events

MemberVault supports outbound webhooks through its **Actions** system, which can call external webhook URLs when specific events occur. Additionally, MemberVault has a Zapier integration with instant triggers for the following event categories:

### User Added to Product

Fires when a user signs up for a specified product. Requires selecting a specific product to watch.

- Note: Manually adding users to a product from the admin panel does not trigger this event.

### Lesson Completed

Fires when a user completes a specific lesson. Requires selecting the lesson to monitor.

### Module Completed

Fires when a user completes a specific module. Requires selecting the module to monitor.

### Engagement Points (EP) Threshold Reached

Fires when a user reaches a configured EP number. Requires specifying the EP threshold.

### Hot Lead Detection

Fires when a user becomes a "Hot Lead" based on product view activity. Requires configuring the number of views that qualifies a user as a hot lead.

### User Email Consent

Fires when a user approves or denies email consent. Can be filtered by consent status (given or not given).

### User Completes an Action

Fires when a user completes a specified action within a product. Requires selecting both the action and the product.

### Account Created

Fires when a new user account is created in the MemberVault instance.

### First Login

Fires when a user logs in to the platform for the first time.
