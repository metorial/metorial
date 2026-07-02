Now I have enough information to create the specification. Let me compile what I've learned:

# Slates Specification for Apilio

## Overview

Apilio is a cloud-based smart home automation platform that allows users to connect and control devices from various brands (Tuya, Philips Hue, Sonoff, Tado, etc.) and build complex automation logic using variables, conditions, and logicblocks with AND/OR/NOT operators. It goes beyond simple if-then rules by supporting multi-condition evaluation, delayed actions, and cross-brand device coordination, integrating with services like IFTTT via webhooks and a REST API.

## Authentication

The Apilio REST API uses a basic authentication token to authenticate requests. You can retrieve the key from your profile page at `https://apilio.herokuapp.com/user`.

The token must be sent with each API request. HTTPS is required for all API calls.

There are no OAuth flows or scopes. Authentication is a single API token per user account.

## Features

### Variable Management

Apilio allows creating variables that store different statuses — such as device on/off states, whether you are home or at work, etc. Being able to use stored information and not just reacting to events allows building richer, more custom automations. The API supports three variable types:

- **Boolean variables**: Can be set to true, set to false, or toggled.
- **String variables**: Can be set to a value or cleared.
- **Numeric variables**: Can be set to a value, or have a value added to or subtracted from the current value.

### Condition Management

Conditions define the rules that compare variable values against expected states (e.g., "Is it nighttime?" checks if a boolean variable equals true). Conditions can be combined with AND/OR/NOT logic. The API allows retrieving condition details and their current evaluation state.

### Logicblock Evaluation

Logicblocks are the core automation units that combine conditions and trigger different sets of actions based on whether the overall evaluation is positive or negative. The API allows:

- Triggering (evaluating) a logicblock.
- Activating or deactivating a logicblock.
- Retrieving logicblock details and current evaluation state.

### Action Chains

You can specify a delay for each action in a custom routine. Apilio lets you daisy-chain IFTTT applets, Tuya actions, Philips Hue actions, and webhook actions, with a different delay for each action in the sequence. Logicblocks support separate action chains for positive and negative evaluation results.

### Outgoing Webhook Actions

Webhooks are an easy way of sending information instantly from Apilio to other services. When the actions are executed in a Logicblock, a webhook sends a message to the unique URL you specify. Webhook actions support custom headers, request bodies, and can include Apilio variable values as parameters.

## Events

The provider does not support events in the traditional webhook/subscription sense. Apilio provides **incoming webhook URLs** that external services can call to update variables or trigger logicblock evaluations, but it does not offer an event subscription mechanism where Apilio pushes notifications to registered listeners when something changes internally. Outgoing webhooks exist only as logicblock actions (not as subscribable event streams).
