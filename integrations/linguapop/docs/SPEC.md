# Slates Specification for Linguapop

## Overview

Linguapop is a language proficiency placement testing platform aligned with the CEFR framework. It allows organizations such as language schools, recruiters, and corporate training departments to send CEFR-aligned placement tests to candidates and receive detailed proficiency results. It operates on a pay-as-you-go model, charging only for completed tests.

## Authentication

Linguapop uses API keys for authentication. Integrations define API keys which developers use to communicate between their applications and Linguapop.

To authenticate:

1. The API key of an integration is the identifier for the integration when accessed by other software. You can provide your developers with the API key of an integration in order for them to access the Linguapop API.
2. Create an integration from the Linguapop dashboard. Each integration generates a unique API key.
3. If you use multiple apps to communicate with Linguapop, you should create an integration for each one.
4. The API key is passed as the `apiKey` parameter in request bodies (for POST requests) or as a query parameter (for GET requests). For example, to fetch languages: `GET https://app.linguapop.eu/api/actions/getLanguages?apiKey=YOUR_API_KEY`
5. Only integrations in the Active integrations section will be accessible to other applications trying to connect via the Linguapop API.
6. If you believe that your API key has been compromised, you can refresh the API key, which generates a new API key for your integration. Refreshing an integration's API key will immediately invalidate the old API key.

There is no OAuth2 flow or other authentication method — only API key-based authentication is supported.

## Features

### Fetch Available Languages

Retrieve the list of languages available for placement testing. You can fetch the list of available languages with their name and language code (e.g., `eng`, `ita`, `spa`, `ger`, `fra`). The language codes are used when creating test invitations. Additional languages may be added over time.

### Create and Send Placement Test Invitations

Create an invitation for a candidate to take a language placement test. Key options include:

- **Candidate details**: Name, email, and an optional external identifier for mapping to your CRM.
- **Language selection**: Specify the target language using a language code.
- **Email delivery**: Choose whether Linguapop sends the invitation email, or handle delivery yourself using the direct test URL returned in the response.
- **Kiosk mode**: Optionally generate a kiosk code so the candidate can access the test through a configured kiosk.
- **Skill sections**: Optionally include reading and/or listening sections in addition to the core grammar test.
- **Return URL**: Optionally specify a URL to redirect the candidate to after completing the test.
- **Callback URL**: Optionally specify a URL to receive test results via webhook when the test is completed.

The API returns a direct URL to the placement test and the invitation ID for tracking.

### Receive Placement Test Results

Upon the completion of a placement test, Linguapop can optionally send the results back to your software. All you need to do to enable this is provide the `callbackUrl` property as part of your request body.

Results include:

- The candidate's final CEFR level (e.g., B2 High) and a machine-readable level code (e.g., `B2H`).
- A numeric rating that maps to 16 fine-grained sub-levels across the A1–C2 CEFR scale.
- Reading and listening scores (if those sections were included).
- Links to both a public results page (for candidates) and an admin results page (for embedding in your application via iframe).
- Completion timestamp.

### CEFR Level Mapping

Linguapop uses 16 sub-levels mapped to the 6 main CEFR levels (A1 through C2), each with a defined rating range. This allows for granular proficiency assessment and custom visualizations within your own software.

## Events

Linguapop supports a callback (webhook) mechanism for receiving placement test results.

### Placement Test Completed

A webhook triggered when a candidate completes a placement test. This emits a new event when a placement test is completed. You must set up the callback URL when sending the test invitation.

- The callback URL is configured per invitation (not globally), by providing the `callbackUrl` parameter when creating the invitation.
- Linguapop sends an HTTP POST request with JSON containing the candidate's details, final CEFR level, level code, numeric rating, reading/listening scores, completion timestamp, and result URLs.
- There is no global webhook registration — each invitation must individually specify its callback URL if results delivery is desired.
