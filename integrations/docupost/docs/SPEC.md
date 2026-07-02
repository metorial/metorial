# Slates Specification for Docupost

## Overview

DocuPost is an online service that allows users to send postal mail, including letters, postcards, and checks, directly from their computer. Users can upload or compose their documents online, specify addresses, and choose mailing options. The service is HIPAA-compliant.

## Authentication

DocuPost uses API token authentication.

- An API token is a unique key required for authenticating API requests to DocuPost.
- To generate a token: navigate to the Developer page in your DocuPost account, click Generate API Token, copy the generated token, and store the token securely.
- To use the API token in your requests, include it in the query string of your HTTP request as the `api_token` parameter. For example: `https://app.docupost.com/api/1.1/wf/sendletter?api_token={YOUR_API_TOKEN}&...`
- You can revoke or generate a new token from your Developer page. Regenerating your API token will provide you with a new token, and the old one will become invalid.

There are no OAuth flows, scopes, or additional credentials required. Only the single API token is needed.

## Features

### Send Letters

Use the Send Letter API to programmatically send letters via U.S. mail through DocuPost.

- Requires recipient and sender address details (name, address lines, city, 2-letter state abbreviation, ZIP code).
- Prepare query string parameters required for your letter, such as recipient and sender details and document URL.
- Content can be provided as a PDF URL or as raw HTML content, which can be useful when you need more flexibility in creating the layout and design of your letter directly within your application.
- Recipient and sender names must be less than 40 characters. Address lines must be in the correct format, and states should use 2-letter abbreviations.
- To cancel a letter, you must do it within an hour of sending.

### Send Postcards

Use the Send Postcard API to programmatically send postcards via U.S. mail.

- Requires recipient and sender address details, plus front and back images for the postcard.
- Images must be 1875 x 1275 pixels and in PNG format.
- If the address is invalid, your mail will fail to send. Ensure all required address fields are correctly filled, including the correct 2-letter U.S. state abbreviation.

### Check Account Balance

The API provides an endpoint to retrieve your current account balance programmatically (`getbalance`). Ensure your account balance is adequate before sending mail, as mailings are charged against your prepaid balance.

### Send Checks (Dashboard Only)

To print and mail checks with DocuPost, you need to sign up for the premium plan. This allows you to use all the features required for sending checks. DocuPost gives a convenient and professional touch for mailing checks. Ensure you have a verified bank account before proceeding. Note: Based on available documentation, check sending appears to be a dashboard feature only and is not exposed through a public API endpoint.

## Events

The provider does not support events. DocuPost's API is action-oriented (send letter, send postcard, check balance) and does not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
