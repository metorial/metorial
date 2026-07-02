# Slates Specification for Wolfram Alpha Api

## Overview

Wolfram Alpha is a computational knowledge engine that answers factual queries by computing results from structured data across mathematics, science, geography, finance, linguistics, and many other domains. It provides multiple API types for different output needs, from full structured results to short text answers, spoken results, and image-based outputs.

## Authentication

Wolfram Alpha uses **API key authentication** via an AppID parameter.

1. Register a Wolfram ID at the [Wolfram Alpha Developer Portal](https://developer.wolframalpha.com).
2. Navigate to the "My Apps" tab and click "Get an AppID" (or "Sign up to get your first AppID").
3. Provide an application name, description, and select the API type you want (e.g., Full Results API, Simple API, etc.).
4. Each application receives a unique AppID.

The AppID is passed as a query parameter (`appid`) in every API request:

```
http://api.wolframalpha.com/v2/query?appid=YOUR_APP_ID&input=your+query
```

For the LLM API, the AppID can alternatively be provided as a Bearer token in the `Authorization` header:

```
Authorization: Bearer YOUR_APP_ID
```

There is no OAuth flow or additional scopes. A verified email address on the Wolfram ID is required for the AppID to work.

## Features

### Full Results Query

Submit free-form natural language queries and receive comprehensive, structured results organized into categorized "pods" (e.g., Input Interpretation, Result, Charts, Properties). Results can be returned in XML or JSON, and individual pod content can be formatted as images, plaintext, MathML, Wolfram Language expressions, or audio. Supports disambiguation via assumptions, pod state changes (e.g., "More digits"), asynchronous pod delivery, and recalculation of timed-out results. Users can filter results by pod ID, title, index, or scanner type. Location can be specified via IP, lat/long, or semantic string to affect location-sensitive queries.

### Short Answers

Returns a single plain text answer extracted from the primary result pod. Ideal for quick lookups or integrations that need a concise, machine-readable response. Queries that cannot produce a sufficiently short answer may fail.

### Spoken Results

Returns a natural language sentence phrasing the computed answer, designed for text-to-speech applications or conversational interfaces. Supports unit system selection (metric/imperial).

### Simple Image Results

Returns the entire Wolfram Alpha result page rendered as a single GIF/JPEG image. Supports customization of layout style, background color, image width, font size, and unit system. Does not support disambiguation or drilldown.

### LLM-Optimized Results

Returns results in a text format optimized for consumption by large language models. Includes computed answers, image URLs, and links back to the Wolfram Alpha website. Supports assumption parameters for disambiguation. The AppID can be passed via query parameter or Authorization header.

### Query Validation and Recognition

Quickly determine whether a query is likely to be understood by Wolfram Alpha before sending a full request. The Fast Query Recognizer classifies queries, indicates the expected content domain, and provides a confidence score. Available in "Default" and "Voice" modes, where Voice mode is more permissive for spoken input. The `validatequery` function performs only the parsing phase to check if input can be interpreted.

### Step-by-Step Solutions

Access detailed step-by-step explanations for mathematical and scientific computations. Useful for educational applications where showing the process of arriving at an answer is important.

### Instant Calculators

Generate interactive, form-based calculator interfaces for common formulas and computations. Users can manipulate variables through assumptions to explore different formula configurations (e.g., RAID array calculator, Doppler shift formula).

### Assumptions and Disambiguation

When queries are ambiguous, the API provides assumption data that enables selecting between interpretations (e.g., "pi" as a mathematical constant vs. a movie), unit systems, date formats, formula variables, coordinate systems, and more. Assumptions can be applied to subsequent queries to refine results.

## Events

The provider does not support events. Wolfram Alpha APIs are purely request-response based and do not offer webhooks, event subscriptions, or purpose-built polling mechanisms.
