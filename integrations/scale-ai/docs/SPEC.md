Now let me get more details on task types and the Studio/Teams features:# Slates Specification for Scale AI

## Overview

Scale AI is a data labeling and annotation platform that turns raw data (images, videos, text, documents, LiDAR/3D point clouds) into high-quality training data for AI/ML applications. It combines machine learning powered pre-labeling and active tooling with varying levels and types of human review. The API allows programmatic creation and management of annotation projects, tasks, and batches.

## Authentication

Scale AI uses **HTTP Basic Authentication** with an API key.

Basic Auth puts the username and password together separated by a colon (username:password). Because Scale doesn't have a password, the value is simply the API key followed by a trailing colon (e.g., `live_ScaleRocks:`). This string is then Base64-encoded and sent in the `Authorization` header as `Basic <encoded_string>`.

Example using curl:

```
curl "https://api.scale.com/v1/tasks" -u "YOUR_API_KEY:"
```

**API Key modes:** Accounts have test mode and live mode API keys. There is no "switch" for changing between modes — just use the appropriate key. Requests made with test mode credentials are not completed by a human and return test responses. Requests made with live mode credentials are completed by a human and will incur a charge.

The live and test modes are truly self-contained and separate. If you have created a Project in live mode and try to reference it when creating a task in test mode, you will get an error.

API keys can be found on the Scale AI dashboard. The base URL is `https://api.scale.com/v1`.

## Features

### Project Management

A project is tied to one specific annotation use case, which is associated with a task type. You can have multiple projects per use case. Projects allow you to create, retrieve, list, and update annotation projects. You can configure default task parameters, instructions, and ontology at the project level. Projects support consensus settings for Studio projects.

### Task Creation and Management

A task represents an individual unit of work. There's a 1:1 mapping between a task and the data to be labeled — for example, one task per image, video, or lidar sequence. Supported task types include:

- **Image Annotation** — bounding boxes, polygons, lines, ellipses, cuboids, and semantic segmentation
- **Video Annotation** — frame-by-frame annotation with tracking, supporting both image sequences and video files
- **Sensor Fusion / LiDAR** — 3D point cloud annotation, segmentation, and top-down annotation with optional camera data
- **Document Transcription**
- **Text Annotation**
- **Multi-Stage Tasks** — chaining multiple annotation stages together

Tasks support annotation attributes for capturing additional metadata per annotation, such as occlusion level, categorical attributes, numerical attributes, angle attributes, and text attributes.

Tasks can be queried and filtered by project, batch, type, status, review status, date ranges, and tags. Tasks support pre-labeling with model-generated hypotheses for annotators to refine.

### Batch Management

Batches can be used to further divide work inside a project. They can tie to specific datasets or be used to note which tasks were part of a weekly submission. There are two types of batches: production batches and calibration batches. Calibration batches help ensure your project is ready for humans to start working on production data. Batches support priority settings (10–30) and must be finalized before tasks are sent to annotators.

### Taxonomy / Ontology Management

A taxonomy is a collection of labels and information associated with those labels, defined at the project level. Available annotations include box, polygon, point, ellipse, cuboid, event, text response, list selection, tree selection, date, linear scale, and ranking. Scale uses Ontologies to maintain complex taxonomies and provide detailed labeling guidance. Ontologies can be used as a replacement or add-on to the project instructions. Ontologies are versioned.

### Quality Auditing (Fixless Audits)

The API supports quality scoring and review workflows for completed tasks, including customer review statuses (accepted/rejected).

### Studio Team Management

For Scale Studio projects, you can manage annotation teams — listing teammates, inviting new members, and updating roles.

### Evaluation Tasks

Evaluation tasks are tasks with known answers, used to measure workers' performance internally to ensure quality. They require an expected response and optionally an initial response for review-phase evaluations.

## Events

Scale AI supports **callbacks** (webhooks) for asynchronous notification of task and batch completion.

### Task Completion Callbacks

When creating a task, you specify a `callback_url` — a fully qualified URL that Scale will POST to with the task results as a JSON body. Alternatively, you can set a default callback URL in your profile. You may also provide an email address as the callback_url, in which case completed tasks will result in an email with the task JSON payload.

- Scale retries delivery up to 20 times over 24 hours if a 2xx response is not received.
- You can manually re-trigger a callback for a completed or errored task via the API.
- Callbacks include a `scale-callback-auth` HTTP header for authentication, with the value equal to the Live Callback Auth Key shown on the dashboard. If this header is not set or is incorrect, the callback is not from Scale.

### Batch Completion Callbacks

When the final task in a batch is completed, the batch status changes to "completed" and a callback is fired to the callback URL specified at batch creation time.
