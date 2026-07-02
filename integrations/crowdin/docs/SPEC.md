Now let me fetch the scopes page and webhook events page:# Slates Specification for Crowdin

## Overview

Crowdin is a cloud-based localization management platform that enables teams to translate and manage multilingual content. It provides tools for uploading source files, managing translations, translation memories, glossaries, and coordinating translation workflows with human translators, vendors, and machine translation engines. Crowdin comes in two editions: Crowdin (standard) and Crowdin Enterprise (with additional organization-level features like workflows, groups, and vendors).

## Authentication

Crowdin supports two authentication methods for API access:

### Personal Access Tokens

Personal access tokens serve as an alternative to passwords for authorizing third-party applications and scripts in Crowdin. Tokens are created in Account Settings under the API tab.

- When creating a new personal access token, you can give it a name as a reminder of what it's used for, set an expiration date, select specific scopes, and, if needed, limit the visibility of resources for the selected scopes using the Granular access option.
- For example, you can create a token that should only interact with a specific project and have no access to others. As a result, only that selected project will be returned when an API request is made to retrieve a list of all projects.
- Tokens are passed via the `Authorization: Bearer ACCESS_TOKEN` header.
- Base URL for Crowdin: `https://api.crowdin.com/api/v2/`
- Base URL for Crowdin Enterprise: `https://{organization_domain}.api.crowdin.com/api/v2/`

### OAuth 2.0 (Authorization Code Flow)

When you build an OAuth app, implement the web application flow described below to obtain an authorization code and then exchange it for a token.

- **Authorization endpoint:** `https://accounts.crowdin.com/oauth/authorize`
- **Token endpoint:** `https://accounts.crowdin.com/oauth/token`
- Parameters: `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`
- This will ask the user to approve the app access to their account based on the scopes specified in REQUESTED_SCOPES and then redirect back to the REDIRECT_URI you provided when creating an app.
- For enhanced security, we strongly recommend using the Proof Key for Code Exchange (PKCE) extension for a more secure token exchange.
- The access token received after a user authorizes the app has an expiration time. The access token expires in the number of seconds defined in the response. Refresh tokens are supported.
- For Crowdin Enterprise, the `organization_domain` can be extracted from the JWT-structured access token.

### Scopes

Scopes let you set the exact access type you need. Scopes limit access for the personal access tokens, OAuth tokens, and Crowdin apps. They don't provide any additional permissions except those the user already has.

Key scopes include: `project` (projects management), `project.source` (source files & strings), `project.translation` (translations), `project.task` (tasks), `project.status` (translation status, read-only), `project.webhook` (webhooks), `project.screenshot` (screenshots), `project.report` (reports), `project.member` (members and teams), `tm` (translation memories), `glossary` (glossaries), `mt` (machine translation engines), `ai` (AI providers and prompts), `notification`, `webhook`, and `*` (all scopes). Crowdin Enterprise adds additional scopes: `user`, `team`, `group`, `vendor`, `client`, `organization`, `field`, and `automation`.

## Features

### Project Management

Create, configure, and manage localization projects. Projects can be file-based (translations tied to uploaded files) or string-based (translations managed as individual key-value pairs). Configure source and target languages, visibility, and collaboration settings.

### Source File & String Management

Upload source files in a wide range of formats, organize them in directories and branches, manage file revisions, and revert to previous versions. For string-based projects, manage source strings directly. Supports version management with branches for parallel feature development.

### Translation Management

Add, update, and download translations. Build translation exports for deployment. Supports pre-translation using translation memory, machine translation, or AI. Upload existing translations in bulk. Configure target file bundles for custom export groupings.

### Translation Memory (TM)

Create and manage translation memories that store previously translated segments. TMs can be project-specific or shared globally across projects. Import and export TM data in TMX and other formats.

### Glossary Management

Maintain terminology glossaries to ensure translation consistency. Glossaries support terms with definitions, part of speech, and per-language translations. Import and export glossary data in TBX and other formats.

### Machine Translation

Connect and manage machine translation engines (e.g., Google Translate, Microsoft Translator, DeepL). Use MT engines for pre-translation or as suggestions in the editor.

### AI Integration

Configure AI providers (e.g., OpenAI, Gemini) and manage AI prompts for use in translation workflows, pre-translation, and the editor. Supports fine-tuning of AI prompts.

### Task Management

Create and assign translation or proofreading tasks to team members or vendors. Tasks can target specific files, strings, or languages, with deadlines and progress tracking. Task statuses include todo, in progress, done, and closed.

### Screenshots

Upload screenshots and tag them with source strings to provide visual context for translators. Manage screenshot tags to map UI elements to translatable strings.

### Reports

Generate reports on translation progress, costs, and team productivity. Includes cost estimation reports and contribution reports for translators and proofreaders.

### Team & Member Management

Invite users to projects and assign roles (manager, developer, translator, proofreader). Control language-level access for translators. Crowdin Enterprise additionally supports teams, vendors, and clients with organization-level member management.

### Translation Status

Retrieve translation and approval progress at the project, file, language, branch, or directory level.

### Over-the-Air Content Delivery

Distribute translations to applications via CDN distributions without requiring app updates.

### Workflow Management (Enterprise Only)

Define multi-step translation workflows with configurable steps such as translation, proofreading, vendor translation, and custom workflow steps.

### Organization & Group Management (Enterprise Only)

Organize projects into hierarchical groups. Manage organization-level settings, security policies, and authentication methods.

## Events

Webhooks allow you to receive information about the key events that happen in your Crowdin project, like completed translations or proofreading. Webhook integration can be implemented at different levels, including Project, Account, or Organization level.

Webhooks can be configured with a target URL, request method (GET or POST), content type (JSON, form-data, or URL-encoded), custom headers, and custom payload templates. For the application/json content type, you can select Batch webhooks to merge multiple events into a single request.

### File Events

Triggered when files in a project change state. Includes: file fully translated (into a target language), file fully reviewed/approved, file added, file updated, file reverted, and file deleted.

### Project Events

Triggered at the project level. Includes: project fully translated (for a target language), project fully reviewed/approved, project successfully built (translations exported), and exported translation updated (final translation of a string changed).

### Source String Events

Triggered when source strings change. Includes: source string added, source string updated, and source string deleted. These events are delivered in batch format.

### Suggested Translation Events

Triggered on translation activity. Includes: suggested translation added, updated, deleted, approved, and disapproved.

### String Comment/Issue Events

Triggered on comment and issue activity on strings. Includes: comment/issue created, updated, deleted, and restored. Payloads include issue type and status information.

### Task Events

Triggered on task lifecycle changes. Includes: task added, task status changed, task updated, and task deleted.

### Account and Organization Events

Triggered at the account or organization level (configured via Account/Organization Settings, not project-level). Includes: project created, project deleted, group created (Enterprise only), and group deleted (Enterprise only).
