Now let me check the Kickbox batch verification API to see if it supports callback URLs/webhooks:# Slates Specification for Kickbox

## Overview

Kickbox is an email verification platform that can help identify deliverable, invalid, or otherwise risky email addresses. Founded in 2014, Kickbox was created to help organizations clean their email lists, verify emails, and reduce their bounce rates. It offers both real-time single email verification and bulk/batch list verification through its API.

## Authentication

Kickbox uses API key authentication. You need to sign up for a free Kickbox account to obtain your API key. This key is essential as it's your pass to access the API.

When you're ready, make an HTTPS request to the Kickbox API. You'll need to include your API key with each call, either as a query string parameter or in the authorization header.

To obtain your API key:

1. Hop over to app.kickbox.com and create a free account. Once you've signed up and logged in, click on API Settings and then click Add API Key. Copy the generated API Key.

Example API call with key as query parameter:
`GET https://api.kickbox.com/v2/verify?email=test@example.com&apikey=YOUR_API_KEY`

Once you've signed up for a new account, you should have access to the Kickbox dashboard where you can generate your Live and Sandbox API keys. Sandbox Mode lets you test the email verification API without using credits. All results are fake, and the default result is "deliverable".

## Features

### Single Email Verification

As soon as someone enters an email on your site, the Kickbox API checks it. The API returns a JSON response with detailed information about the email address.

- **Verification result**: The JSON response will include a 'result' field that can be 'deliverable', 'undeliverable', 'risky', or 'unknown'. This comes along with a 'reason' field that provides more context for the result.
- **Disposable detection**: Identifies if the email address uses a disposable domain like trashmail.com or mailinator.com.
- **Role address detection**: Detects if the email address is a role address (postmaster@example.com, support@example.com, etc).
- **Free email detection**: Identifies if the email uses a free email service like gmail.com or yahoo.com.
- **Accept-all detection**: Indicates if the email was accepted, but the domain appears to accept all emails addressed to that domain.
- **Typo suggestion**: The API can often detect when a user has made a typo in their email domain (like 'gamil.com' instead of 'gmail.com') and suggest the correct version. Returned in the `did_you_mean` field.
- **Sendex™ quality score**: A quality score of the provided email address ranging between 0 (no quality) and 1 (perfect quality).
- **Timeout**: Optionally, you can set a timeout parameter to limit how long the API waits before giving up on a verification attempt. Default is 6000ms.

### Batch Email Verification

Batch Email Verification allows you to verify a large number (up to 1 million) email addresses at once using Kickbox's Batch Verification API. Lists can be uploaded as CSV files or submitted via the API.

- Useful for cleaning existing email lists before campaigns or for periodic list maintenance.
- Results are returned with the same verification data as single verification (deliverability, sendex score, etc.).

### Sandbox Testing

Decide whether you want to use the Sandbox mode or Production mode. Sandbox is great for testing as it doesn't use up your credits. As a result, you get mock results for trial runs.

## Events

The provider does not support events. Kickbox is a request-response verification service and does not offer webhooks, event subscriptions, or other push-based notification mechanisms through its API.
