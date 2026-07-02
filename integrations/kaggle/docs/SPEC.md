# Slates Specification for Kaggle

## Overview

Kaggle is an online platform for data science and machine learning, owned by Google. It provides programmatic access to competitions, datasets, kernels (notebooks), and models. The API allows users to search, download, create, and manage these resources.

## Authentication

Kaggle uses **HTTP Basic Authentication** with a username and API key pair.

The Kaggle API requires authentication to access most of its functionality. Authentication is performed using API credentials consisting of a username and an API key.

**Obtaining Credentials:**

After login, you can download your Kaggle API credentials at https://www.kaggle.com/settings by clicking on the "Generate New Token" button under the "API" section. This provides an API token string.

There is also a legacy credential method: From your Kaggle account settings page, under "Legacy API Credentials", click on the "Create Legacy API Key" button to generate a `kaggle.json` file. This file contains a JSON object with `username` and `key` fields.

**Using Credentials:**

Credentials are sent via HTTP Basic Authentication, where the username is your Kaggle username and the password is your API key. The base URL is `https://www.kaggle.com/api/v1`. Credentials are Base64-encoded as `username:key` and sent in the `Authorization: Basic <encoded>` header.

Alternatively, you can populate `KAGGLE_USERNAME` and `KAGGLE_KEY` environment variables with values from `kaggle.json` to authenticate.

**Note:** Some commands allow anonymous access, enabling users to download public datasets without the need for API credentials.

## Features

### Competitions

List competitions, download competition data, and submit to a competition. You can search and filter competitions by category (e.g., featured, playground), group, and sort order. You can view competition leaderboards, list competition files, and check submission history.

- Submissions are made by uploading a file along with a description message.
- Competition data can be downloaded as individual files or as a full archive.

### Datasets

List, create, update, download, or delete datasets. You can search datasets by keyword, file type, license, size range, and tags. Users can create new datasets by initializing metadata and uploading files, then publish new versions with changelogs.

- Datasets are referenced by `owner_slug/dataset_slug` format.
- Downloads are typically delivered as ZIP archives.

### Kernels (Notebooks)

List, update and run, download code and output, or delete kernels (notebooks). You can search kernels by dataset, competition, language, kernel type (notebook or script), and output type. Users can push (create/update) kernels and pull their source code, retrieve execution output, and check run status.

- Kernels can be associated with specific competitions or datasets.
- Kernel execution is asynchronous; you push the code and then check its status.

### Models

List, create, update, download, or delete models and model variations. You can manage variations of your Kaggle Models and manage versions of your Kaggle Model Variations.

- Models support multiple variations (e.g., different frameworks like TensorFlow, PyTorch).
- Each variation can have multiple versions.
- Models and their variations can be downloaded individually or as specific versions.

### Configuration

Users can view, set, and unset configuration values for the API client, such as default competition or path settings.

## Events

The provider does not support events. Kaggle does not offer webhooks or any purpose-built event subscription mechanism through its API.
