Now let me try to access the actual API documentation if it exists:Let me check the Pipedream source code for more details on the Async Interview integration:Now I have enough information to construct the specification. Let me also look at the GitHub source for the Pipedream component to get more details about the API methods:Based on all the research gathered, here is the specification:

# Slates Specification for Async Interview

## Overview

Async Interview (asyncinterview.ai) is an asynchronous video interviewing platform that allows recruiters and hiring teams to create pre-recorded interview questions and have candidates respond via video, audio, or text at their convenience. It is a digital interviewing platform designed to streamline the hiring process by enabling asynchronous video interviews and collaborative candidate assessment. It integrates with major ATS platforms such as Lever, BambooHR, Teamtailor, Recruitee, JazzHR, SmartRecruiters, Greenhouse, Workable, Ashby, TalentClue and 50skills.

## Authentication

Async Interview supports API key-based authentication.

Async Interview uses API keys for authentication. The API token is passed as a Bearer token in the `Authorization` header of each request.

- **Base URL:** `https://app.asyncinterview.ai/api/`
- **Header:** `Authorization: Bearer <api_token>`

The API token can be generated from your Async Interview account settings. Example request:

```
GET https://app.asyncinterview.ai/api/jobs
Authorization: Bearer YOUR_API_TOKEN
```

**Note:** Some third-party integrations reference OAuth authentication for Async Interview. The integration uses secure OAuth authentication, ensuring only authorized workflows access your Async Interview data. However, the primary documented API authentication method is Bearer token-based API keys. OAuth may be available for specific partner integrations.

## Features

### Job Management

Manage interview jobs (positions) through the API. The Async Interview API enables automation around video interview processes. With this API, you can manipulate interview data, initiate new interviews, and respond to events within the Async Interview platform. You can list and retrieve jobs, which represent interview campaigns tied to open positions.

### Interview Responses

Access and retrieve candidate interview responses. Responses contain candidate-submitted video, audio, or text answers to interview questions. Applicants have the flexibility to respond to your interview at their convenience, aligning with your set deadlines, utilizing video, audio, or text responses. You can list interview responses to analyze candidate submissions programmatically.

### Candidate Invitations

Invite candidates to participate in interviews. Effortlessly invite candidates in bulk. You can upload a CSV file, send individual invitations, or share the link on a job board.

### AI Transcription

Experience seamless transcription with AI. Say goodbye to manual transcriptions & save time while ensuring the accuracy and efficiency you need. Transcription data may be accessible through the API alongside interview responses.

### Branding & Customization

Make a lasting impression with your brand's identity. Comprehensive customization options allow you to tailor the look and feel of your interviews.

- Customizable interview pages with company branding.

### File Attachments

Looking for CVs, pitch decks, or portfolios? The platform supports collecting file-based submissions from candidates in addition to video/audio responses.

## Events

The platform offers API with Webhooks so that you can use the platform in whatever way you want.

### Interview Response Received

Triggered when a candidate submits a new interview response. Emit new event when a new interview response is received. This can be used to automate follow-up workflows such as notifying hiring managers, pushing data to an ATS, or triggering candidate evaluation processes.

**Note:** While the platform advertises webhook support, the publicly available integration implementations (e.g., on Pipedream) use a polling mechanism to check for new interview responses rather than native webhook delivery. The exact webhook configuration options and supported event types beyond interview responses are not publicly documented in detail.
