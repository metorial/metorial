# Slates Specification for RunPod

## Overview

RunPod is a cloud computing platform that provides on-demand GPU and CPU infrastructure for AI/ML workloads. It is built for AI, machine learning, and general compute needs, offering scalable, high-performance GPU and CPU resources for training, fine-tuning, and deploying models. The platform offers two primary compute models: persistent GPU Pods and auto-scaling Serverless endpoints.

## Authentication

RunPod uses **API Key** (Bearer token) authentication for all API requests.

- All requests require a RunPod API key in the request headers.
- The API key is passed as a Bearer token in the `Authorization` header: `Authorization: Bearer <RUNPOD_API_KEY>`.
- Keys can be created with permissions set to All, Restricted, or Read Only. If you choose Restricted, you can customize access for each RunPod API, including per-endpoint access for Serverless endpoints.
- New keys are created with an `rpa_` prefix.
- API keys are generated in the RunPod console under **Settings > API Keys**.
- RunPod does not store your API key, so it must be saved at creation time.

**Base URLs:**

- REST API: `https://rest.runpod.io/v1/`
- Serverless Endpoints: `https://api.runpod.ai/v2/{endpoint_id}/`
- GraphQL API (legacy): `https://api.runpod.io/graphql?api_key={YOUR_API_KEY}`

## Features

### Pod Management

Create and manage persistent GPU/CPU instances (Pods) for development, training, and long-running workloads. You can create, list, get, start, stop, resume, and terminate Pods, specifying GPU type, container image, disk size, and environment variables. Pods support both on-demand and spot (interruptable) instances with configurable bid pricing.

### Serverless Endpoints

Deploy and manage serverless endpoints for AI inference. You can invoke jobs, get job status, purge job queues, and more. Key operations include:

- **Synchronous execution** (`/runsync`): Waits for job completion before returning the result. Works best for quick operations (under 30 seconds).
- **Asynchronous execution** (`/run`): Designed for long-running tasks. Returns a Job ID that can be used to check status later.
- **Streaming** (`/stream`): For jobs that generate output incrementally, receive partial results as they become available.
- **Job status**: Check the state of a job (IN_QUEUE, IN_PROGRESS, COMPLETED, FAILED, CANCELLED, TIMED_OUT).
- **Job cancellation**: Cancel a specific job in progress.
- **Queue purge**: Clear all pending jobs from the queue without affecting jobs already in progress.
- **Health monitoring**: The health endpoint provides insights into the operational status, including the number of workers available and job statistics.

Endpoints can be configured with autoscaling parameters including min/max workers, GPU type, idle timeout, and execution timeout.

### Network Volumes

Create persistent storage volumes that can be attached to Pods and Serverless endpoints. Volumes persist across Pod restarts and can be shared between compute instances. Volumes are region-specific.

### Templates

Save and reuse Pod and endpoint configurations as templates to standardize deployments across projects and teams. Templates define container images, environment variables, ports, and resource requirements.

### Container Registry Authentication

Connect to private Docker registries by storing credentials (username/password) in RunPod. These credentials are used when pulling private container images for Pods and Serverless workers.

### Billing and Usage

Access detailed billing history for Pods, Serverless endpoints, and Network Volumes to monitor spending and optimize costs.

### Public Model Endpoints

RunPod offers Public Endpoints for instant API access to pre-deployed AI models for image, video, audio, and text generation. These can be called directly with an API key without deploying your own infrastructure.

## Events

RunPod supports **per-job webhook notifications** for Serverless endpoints. You can receive notifications when jobs complete by specifying a webhook URL in the job request payload.

### Serverless Job Completion Webhooks

Webhooks allow the RunPod serverless system to make HTTP callbacks to your specified URL when a job completes processing, pushing results to your application rather than requiring polling.

- The webhook URL is specified per-request as a top-level `webhook` field in the job submission payload.
- When a request completes processing, RunPod sends an HTTP POST to the webhook URL. The payload contains the same data structure returned from the `/status` endpoint, including job ID, status, execution time, and output.
- The webhook endpoint should return a 200 status code. If the call fails, RunPod retries up to 2 more times with a 10-second delay.
- Webhooks are triggered for completed and failed jobs.
- There is no built-in webhook authentication mechanism; verification must be handled by the receiving application.

RunPod does not offer platform-level webhooks for resource lifecycle events (e.g., Pod state changes, endpoint scaling events, or billing alerts).
