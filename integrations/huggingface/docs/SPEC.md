# Slates Specification for Hugging Face

## Overview

Hugging Face is a platform for hosting and sharing machine learning models, datasets, and application demos (Spaces) via Git-based repositories. It is an open-source platform dedicated to advancing natural language processing (NLP) and machine learning (ML), offering an ecosystem of libraries, models, datasets, and tools that enable developers and researchers to build and fine-tune advanced AI models. It also provides inference APIs to run predictions on hosted models without managing infrastructure.

## Authentication

### User Access Tokens (API Keys)

User Access Tokens are the preferred way to authenticate an application or notebook to Hugging Face services. Tokens are created in the user's profile settings under the Access Tokens tab. Tokens begin with `hf_`.

Tokens are passed as a Bearer token in the `Authorization` header:

```
Authorization: Bearer hf_xxxxx
```

Token roles control access levels:

- **Fine-grained**: Tokens with this role provide fine-grained access to specific resources, such as a specific model or models in a specific organization.
- **Read**: Tokens with this role can only provide read access to repositories you could read, including public and private repositories that you, or an organization you're a member of, own.
- **Write**: Tokens with this role provide read and write access to repositories.

### OAuth 2.0 / OpenID Connect

Hugging Face provides OAuth 2.0 and OpenID Connect support, allowing external applications to implement "Sign in with Hugging Face" functionality.

Key endpoints:

- **Authorization**: `https://huggingface.co/oauth/authorize`
- **Token**: `https://huggingface.co/oauth/token`
- **OpenID Configuration**: `https://huggingface.co/.well-known/openid-configuration`

OAuth applications are created through the user settings interface. Each application receives a `client_id` and `client_secret` for authentication flows.

You can create or use OAuth apps without a client secret, which is useful for native apps, CLIs, or other contexts where keeping a secret is impractical. Public apps authenticate using only the client ID (e.g., in device code or authorization code flows with PKCE).

Supported OAuth scopes (with `openid` and `profile` always included):

- `openid` – OpenID Connect identity
- `profile` – User profile information
- `email` – User email address
- `read-repos` – Read access to repositories
- `write-repos` – Write access to repositories
- `manage-repos` – Manage repositories (create, delete, update settings)
- `inference-api` – Make inference requests on behalf of the user

## Features

### Model Repository Management

Create, update, delete, and manage model repositories on the Hub. You can create and manage repositories, download and upload files, and get useful model and dataset metadata from the Hub. Repositories are Git-based with version control, branching, tagging, and pull requests. Repositories can be public or private, with private repositories visible only to the owner or organization members. Models can be "gated" to require access requests from users.

### Dataset Repository Management

Host, upload, download, and browse datasets. The Hub is home to over 500k public datasets in more than 8k languages. The Hub makes it simple to find, download, and upload datasets. Datasets have documentation via Dataset Cards and can be explored via the Data Studio viewer.

### Spaces (Application Hosting)

Spaces make it easy to create and deploy ML-powered demos in minutes. Spaces support Gradio, Docker, and static HTML as SDKs. You can create, configure, duplicate, and manage Spaces, including setting secrets, environment variables, and hardware (GPU) upgrades.

### Model Inference

Leverage over 800,000+ models from different open-source libraries. Use models for a variety of tasks, including text generation, image generation, document embeddings, NER, summarization, image classification, and more.

Two tiers are available:

- **Serverless Inference API**: Free tier for prototyping; models are loaded on-demand on shared infrastructure.
- **Inference Providers**: Give developers access to hundreds of ML models, powered by world-class inference providers, integrated into client SDKs. The platform integrates with leading AI infrastructure providers through a single, consistent API.
- **Inference Endpoints (Dedicated)**: Deploy models on dedicated, fully managed infrastructure with autoscaling.

An OpenAI-compatible endpoint is available for chat completions, with provider selection policies (fastest, cheapest, preferred).

### Search and Discovery

Search for models, datasets, and Spaces on the Hub. Filter by author, library, language, task, tags, and trained datasets. Retrieve metadata and statistics about repositories.

### Community Features (Discussions and Pull Requests)

PRs and Discussions support peer reviews on models, datasets, and spaces to improve collaboration across teams. Users can create discussions, open pull requests, and post comments on any repository.

### Organizations

The Hub offers Organizations, which can be used to group accounts and manage datasets, models, and Spaces. The Hub allows admins to set roles to control access to repositories, and manage their organization's payment method and billing info.

### Collections

Users can curate collections of related models, datasets, and Spaces into organized groups for discovery and sharing.

## Events

Hugging Face supports webhooks that send HTTP POST requests to a configured target URL when events occur on watched repositories.

Webhooks allow you to listen for new changes on specific repos or to all repos belonging to particular users/organizations you're interested in following. Webhooks are configured in user settings by specifying target repositories, a target URL, and an optional secret. If you set a secret for your Webhook, it will be sent along as an `X-Webhook-Secret` HTTP header on every request.

### Repository Events (`repo`)

Global lifecycle events on repositories: create, delete, update, and move. Applies to models, datasets, and Spaces.

### Repository Content Events (`repo.content`)

Triggered on content changes such as new commits, tags, or branches. Also triggers on new pull requests due to newly created references. Payload includes `updatedRefs` with old and new commit SHAs for each changed reference.

### Repository Configuration Events (`repo.config`)

Triggered when repository settings change, such as visibility (public/private) or storage backend configuration. Payload includes `updatedConfig` with the changed settings.

### Discussion Events (`discussion`)

Triggered when a discussion or pull request is created, updated (title or status change), deleted, or merged. The payload indicates whether the discussion is a pull request via the `isPullRequest` field.

### Comment Events (`discussion.comment`)

Triggered when a comment is created, updated, or hidden on a discussion or pull request. Payload includes the comment content, author, and visibility state.
