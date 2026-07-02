Now let me look for more details about the specific API capabilities and whether HackerRank Work supports webhooks.Now I have enough information to write the specification. Let me compile what I've learned:

# Slates Specification for HackerRank Work

## Overview

HackerRank for Work is a technical hiring platform that enables companies to create and administer coding assessments (tests), conduct live coding interviews, and manage candidate evaluations. It provides a question library, automated scoring, plagiarism detection, and integrates with major Applicant Tracking Systems (ATS). The platform supports 40+ programming languages and various question types including coding, projects, and database challenges.

## Authentication

HackerRank for Work uses **Personal Access Tokens** for API authentication.

Each enterprise user with a HackerRank for Work account can use the APIs to generate a personal access token.

**Generating an API Token:**

1. Click the arrow next to the user icon in the top-right corner of the Home page, then click **Settings**.
2. On the **API** page, click **New Token**.
3. Enter a label for the token and click **Generate Token**.
4. Copy and store the token securely.

The token is passed in API requests as an authentication header. The base URL for the API is `https://www.hackerrank.com/x/api/v3/`.

**Note:** These tokens are intended for automating tasks such as administering tests and fetching results. Separate API keys are used for ATS-specific integrations (e.g., Greenhouse, Lever, Workday) and are generated from the Integrations settings page.

**SkillUp Reporting APIs** (a separate product area) use a different authentication method: OAuth 2.0 Client Credentials flow, where you obtain an access token by making a POST request to the `/v1/oauth2/token` endpoint with client credentials encoded in Base64 format. These tokens are valid for 10 minutes.

## Features

### Test Management

Create, configure, and manage coding assessments (tests). HackerRank offers APIs to automate test administration and result retrieval, allowing integration with HR systems or custom dashboards. You can view test details, list all tests, and retrieve information about the questions contained within each test.

### Candidate Invitations and Tracking

Invite candidates to take tests programmatically and track their status through the hiring workflow. When retrieving candidate data via the API, the response includes status fields ("status" and "ats_state") that correspond to a candidate's position in the HackerRank workflow. Candidate status can reflect states such as invited, started, completed, and various ATS-aligned states (e.g., qualified, failed, accepted).

### Candidate Reports and Results

Retrieve detailed candidate assessment results including scores, skill-level breakdowns, and report URLs. Results include the candidate's overall score and benchmark data showing how performance compares with others who attempted the same questions. Reports also include integrity signals such as plagiarism detection and suspicious activity indicators.

### Interview Management

HackerRank Interviews is an online platform for conducting live coding interviews where interviewers can invite candidates to a live session for real-time collaboration and code writing. The API supports creating QuickPad sessions, scheduling interviews, listing all interviews, and fetching interview reports.

### User Management

Create and manage users programmatically within the HackerRank for Work account. This is useful when integrating HackerRank with other systems that need to provision user accounts automatically.

### Team Management

Create and manage teams, and control team membership. The API allows you to create new teams and retrieve lists of team members, supporting organizational structures for collaborative hiring.

### Question Library

Access and manage the question repository. The API provides access to questions and challenges that can be used in tests and interviews, covering various question types including coding, multiple choice, projects, and database challenges.

### SkillUp Reporting (Separate Module)

Extract skill signals, badges, and certification data from SkillUp, HackerRank's learning and development product. Available endpoints include credentials (badges and certifications) and user learning progress data. This uses separate OAuth 2.0 authentication as described above.

## Events

The provider does not support webhooks or event subscriptions through its public API. HackerRank for Work relies on polling via API calls to check for candidate status changes and test completions. For ATS integrations (e.g., Workday, Lever), HackerRank uses scheduled polling jobs (e.g., every 10 minutes) to check for state changes rather than webhook-based event delivery.
