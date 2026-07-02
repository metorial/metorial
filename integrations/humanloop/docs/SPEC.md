Let me get more details on the API reference to understand the features better.Now let me check the API reference structure to understand the full feature set and confirm authentication details.Now I have enough information to write a comprehensive specification. Note: The Humanloop platform is being sunset on September 8th, 2025, but I'll document it as-is. Also, the webhook search for Humanloop specifically showed no results — the "hitl.sh" result was for a different product ("Human in the Loop"), and APITracker lists webhooks as not available for Humanloop.

# Slates Specification for Humanloop

## Overview

Humanloop is an LLM development platform that provides evaluation, prompt management, and observability tooling for building AI applications with large language models. It enables AI and product teams to develop LLM-based applications that are reliable and scalable, principally serving as an evaluation suite and a collaborative workspace where engineers, PMs, and subject matter experts improve prompts, tools, and agents together. **Note:** The Humanloop platform will be sunset on September 8th, 2025.

## Authentication

API keys allow you to access the Humanloop API programmatically in your app. This is the only authentication method for API access.

- **Method:** API Key via request header
- **Header:** `X-API-KEY` — pass the API key as the value of this header on all requests
- **Base URL:** `https://api.humanloop.com/v5/`
- **How to obtain:** Go to your Organization's API Keys page, click the "Create new API key" button, enter a name, click Create, and copy the generated API key and save it in a secure location. You will not be shown the full API key again.
- API tokens are only visible once on creation and then obfuscated. Users can manage the expiry of API keys.

Additionally, when using Humanloop as a proxy to call LLM providers, you can pass provider API keys (e.g., OpenAI, Anthropic, Cohere, AWS Bedrock) in the request body under the `provider_api_keys` field.

## Features

### Prompt Management

Prompt management is the process of creating, updating, and versioning your Prompts, Tools, Flows, and Datasets. Files have immutable Versions that are uniquely determined by their parameters that characterize the behavior of the system. For example, a Prompt Version is determined by the prompt template, base model, and hyperparameters.

- Create, update, and retrieve Prompts with templated messages using `{{variable}}` syntax.
- Within the Editor and via the API, you can commit new Versions of a File, view the history of changes, and revert to a previous version via deployments.
- Each version is uniquely identified by hashing its parameters. Humanloop computes this hash based on the template, the temperature, and other parameters and logs accordingly.

### LLM Proxy Calls

Calls to large language models can go via Humanloop, which forwards requests to model providers and logs the results automatically. Alternatively, your app can call the model provider directly, then log results to Humanloop.

- Supports calling prompts with streaming and non-streaming modes.
- Supports multiple model providers including OpenAI, Anthropic, Cohere, and AWS Bedrock.

### Evaluations

Evaluators judge the output of Prompts, Tools, Flows, or other Evaluators. The core entity is an Evaluator — a function you define which takes an LLM-generated log as an argument and returns a judgment. The judgment is typically either a boolean or a number.

- Three Evaluator sources: Code (deterministic rules on cost, latency, regex, etc. — fast and cheap to run), AI (using other foundation models to judge output), and Human (manual feedback).
- Evaluators can be leveraged for monitoring your live AI application as well as for Evaluations to benchmark different versions against each other pre-deployment.
- Run evaluations programmatically against a dataset with specified evaluators.

### Datasets

Datasets on Humanloop are collections of Datapoints used for evaluation and fine-tuning. A Datapoint is a test case for your AI application containing inputs, messages, and target fields.

- Create, update, and manage datasets via the API.
- Datasets are foundational for Evaluations. Evaluations iterate over Datapoints, generating output from different versions of your AI application for each one. The Datapoints provide specific test cases, each containing input variables and optionally a target output.

### Flows

Flows are orchestrations of Prompts, Tools, and other code — enabling evaluation and improvement of complete AI pipelines.

- Log and version complex multi-step AI pipelines.
- Trace execution of flows for debugging and evaluation.

### Agents

A Humanloop Agent is a multi-step AI system that leverages an LLM, external information sources, and tool calling to accomplish complex tasks automatically. It comprises a main orchestrator LLM that utilizes tools to accomplish its task.

- Configure workflow parameters such as `max_iterations` and stopping tools.
- Agents are currently in beta and subject to change.

### Tools

Tools represent external functions or capabilities that can be called by Prompts and Agents.

- Tools are versioned using their source code. Includes a jsonSchema decorator to streamline function calling.
- Tools can be managed via the API and combined with Prompts in agent workflows.

### Logging and Observability

Every time a Prompt is called or an LLM response is logged, the resulting Log is associated with a specific version.

- Log LLM calls with inputs, outputs, latencies, token counts, and costs.
- Support for tracing with parent-child relationships via `trace_parent_id`.
- Attach human feedback and evaluator judgments to logs.

### Environments and Deployments

Environments enable you to deploy model configurations and experiments, making them accessible via API, while also maintaining a streamlined production workflow.

- Every organization automatically receives a default production environment.
- Deploy specific prompt versions to different environments (e.g., staging, production).
- Target a specific environment when making API calls.

### Directory and File Management

- Organize Prompts, Evaluators, Datasets, and Flows into directories.
- All Files can be exported and imported in a serialized form.

## Events

The provider does not support webhooks or event subscriptions. There is no documented webhook or event-driven notification system in the Humanloop API.
