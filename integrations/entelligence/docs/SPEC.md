I see there are two different companies called "Entelligence" — one is a consulting/services platform (entelligence.com) and one is an AI-powered engineering intelligence platform (entelligence.ai). Given the context of building an integration on Slates, the AI-powered engineering platform (entelligence.ai) is the more relevant one. Let me research its API and authentication details.Now let me check the chat-with-docs page for completeness:Now I have a comprehensive understanding of Entelligence AI. Let me compile the specification.

# Slates Specification for Entelligence

## Overview

Entelligence AI (entelligence.ai) is an AI-powered engineering intelligence platform that provides automated code reviews on pull requests, auto-generated codebase documentation, and team performance analytics. It helps development teams move faster, write better code, and collaborate more effectively by introducing intelligence into every stage of the engineering process. It integrates with source control platforms (GitHub, GitLab, Bitbucket), project management tools (Jira, Linear, Asana), communication platforms (Slack, Discord), and documentation tools (Confluence, Notion, Google Docs).

## Authentication

Entelligence AI uses **API Key** authentication for programmatic access.

The API requires an Entelligence API Key, along with a Repository Name and Organization Name to specify which codebase to interact with.

**Generating an API Key:**

1. Visit the API Management Portal at `https://entelligence.ai/manage/api`.
2. Log in with your Entelligence account.
3. In the "API Keys" section, click "Generate Secret" if you don't have a key, or copy your existing key.

**Usage:**

The API key is passed alongside a repository name and organization name when initializing. For example:

```json
{
  "apiKey": "your-api-key",
  "repoName": "your-repo",
  "organization": "your-org"
}
```

Each API key is unique to your organization. You can regenerate your key at any time, but doing so invalidates the previous one.

For self-hosted GitLab integrations, Entelligence also supports **OAuth2** authentication, requiring an OAuth application configured on the GitLab instance with a redirect URI of `https://www.entelligence.ai/api/auth/callback/your-org-name` and scopes including `api`, `read_api`, `read_user`, `read_repository`, `profile`, `email`, and `write_repository`.

## Features

### AI-Powered Pull Request Reviews

Entelligence automates the code review process by providing detailed, context-aware feedback on code changes, offering line-by-line reviews, PR summaries, and real-time discussions to catch issues early. Reviews include a configurable scoring framework that evaluates production impact, PR specificity, and urgency. Review verbosity can be set to concise or verbose modes. The system can auto-generate PR titles, link related tickets, and produce walkthrough summaries of changed files.

- A learning engine adapts review feedback over time based on team preferences and emoji reactions (👍/👎).
- Teams can upload or auto-generate coding guidelines (`.txt`, `.md`, `.doc`) and assign them per repository.
- A code overview dashboard tracks PRs reviewed, average time to merge, acceptance ratio, and at-risk PRs.

### Automated Documentation Generation

An advanced documentation engine that automatically generates accurate, structured, developer-friendly documentation from your codebase by analyzing source files, commit history, code semantics, and repository structure. Documentation includes architecture diagrams, module breakdowns, component descriptions, entry points, and interaction flows. Supports multiple languages including TypeScript, Python, Go, and Java. Enables real-time collaborative editing with live sync across sessions. Documentation updates automatically when PRs change core modules.

### Chat with Docs

An AI-powered conversational interface that allows querying your codebase, pull requests, issues, and team contributions using natural language. Multiple specialized AI agents are available: Code Agent (codebase Q&A), general Agent (cross-source analysis), Multi-Step (complex reasoning/planning), and Agent-3-beta (experimental low-latency agent). Supports slash commands such as `/generateExecutiveSummary`, `/findCode`, `/explain`, `/listPRs`, `/issueThemes`, `/onboard`, and `/visualize`.

### Team Performance Insights

Analytics platform providing visibility into engineering team performance across three dimensions: team overview, individual performance reviews, and sprint assessments.

- **Team Overview Dashboard**: Multi-team performance comparison, code review quality tracking, work classification (bugs, features, innovation, maintenance), and engineer-level productivity benchmarking.
- **Individual Performance Reviews**: Multi-dimensional skills assessment with radar charts, scoring across code quality/productivity/collaboration, and actionable development recommendations.
- **Sprint Assessments**: Sprint-by-sprint team health analysis, individual contributor impact within sprint context, code quality progression, and historical sprint comparison.

### Embeddable Chat Widget

A customizable chat widget (`@entelligence-ai/chat-widget`) that can be embedded into web applications to provide AI-powered codebase Q&A. Supports React, Vue, Angular, Next.js, and vanilla JavaScript. Configurable with light/dark themes and scoped to specific repositories and organizations via the API key.

### IDE Integration

IDE integration brings intelligent code review capabilities directly into the editor (VS Code, Cursor, Windsurf), enabling developers to identify bugs, design issues, and optimization opportunities before committing code. Features include real-time code review feedback, code generation from natural language, and automated refactoring suggestions.

### MCP Integration

An implementation of the Model Context Protocol (MCP) that connects AI assistants in IDEs directly to the Entelligence development ecosystem. Enables intelligent code reviews on git diffs, sequential design thinking sessions, and publishing documentation to connected tools (Google Docs, Notion, Confluence, Slack, Linear) from within the IDE.

### Third-Party Tool Integrations

Entelligence connects with external tools across several categories:

- **Communication**: Slack, Discord — real-time updates on PR reviews, sprint summaries, and team health.
- **Documentation**: Confluence, Google Docs, Notion — auto-sync documentation and link engineering outputs.
- **Project Management**: Jira, Linear, Asana — sync story points and issue metadata.
- **Observability**: Sentry, PagerDuty, Datadog — track quality signals and error rates in context.

Integrations are configured via OAuth-based authorization flows within the Entelligence dashboard.

## Events

Based on available documentation, Entelligence AI does not expose a public webhook or event subscription system for external consumers. The platform delivers notifications through its connected integrations (e.g., Slack/Discord messages for PR reviews and sprint summaries), but does not provide purpose-built webhooks or a dedicated event subscription API that third parties can register endpoints against.

The provider does not support events.
