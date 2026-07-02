# <img src="https://provider-logos.metorial-cdn.com/twilio.svg" height="20"> Twilio Flex

Manage a cloud-based contact center across voice, SMS, WhatsApp, Facebook Messenger, and web chat channels. Create and manage customer interactions and conversations, add or remove participants, and transfer conversations between agents. Route tasks to agents using attribute-based rules with TaskRouter, managing workspaces, workers, task queues, and workflows. Configure Flex instance settings including UI appearance and enabled channels. Define messaging channel flows (Flex Flows) to control how inbound messages are routed. Access contact center analytics and insights including agent activity, queue metrics, and custom KPIs. Trigger and manage Studio communication workflows programmatically. Subscribe to interaction, task, and conversation events via webhooks and event streams.

## Tools

### Create Interaction

Create a new customer interaction in Twilio Flex. Use this to initiate inbound or outbound conversations across channels (SMS, WhatsApp, web chat, voice). Specify the channel type, routing configuration, and participant details.

### Get Flex Configuration

Retrieve the current Flex instance configuration. Returns UI settings, enabled channels, account SID, runtime domain, and other configuration properties that control the appearance and behavior of your Flex instance.

### Get Workspace Statistics

Retrieve real-time and cumulative statistics for a TaskRouter workspace. Returns metrics like total tasks, tasks by status, average wait time, available workers, and activity-level breakdowns. Optionally fetch per-queue or per-worker statistics.

### List Conversation Messages

List messages in a Twilio Conversation. Returns the message history for a given conversation, including author, body, and timestamps. Use order parameter to sort ascending or descending.

### Manage Activities

Create, read, update, delete, or list activities in a TaskRouter workspace. Activities describe what workers are doing (e.g., "Available", "Break", "Offline") and whether they are eligible to receive new task assignments.

### Manage Conversation Participants

Add, remove, update, or list participants in a Twilio Conversation. Participants can be chat-based (identity) or SMS/WhatsApp-based (phone number). Use this to manage who is part of a conversation.

### Manage Conversations

Create, read, update, delete, or list Twilio Conversations. Conversations are the container for multi-party messaging across channels. Use this to set up new conversation threads, update their state, or retrieve conversation details.

### Manage Flex Flows

Create, read, update, delete, or list Flex Flows. A Flex Flow defines how incoming messages on a given channel (SMS, WhatsApp, web chat, etc.) are routed into the Flex contact center. It links a messaging channel to Flex and specifies the integration type (Studio flow, external webhook, or direct task creation).

### Manage Interaction Channel

Get details or update the status of a channel within a Flex interaction. Use this to close a channel, fetch channel status, or list all channels for an interaction.

### Manage Interaction Participants

Add, remove, or list participants in a Flex interaction channel. Use this to invite agents, transfer conversations between agents, or remove participants from a channel.

### Manage Studio Flows

List, get, or trigger Studio Flow executions. Studio Flows are visual communication workflows for IVR, chatbot logic, and routing. Use this to view available flows, trigger outbound flow executions, or check execution history.

### Manage Task Queues

Create, read, update, delete, or list task queues in a TaskRouter workspace. Task queues hold tasks waiting to be assigned to workers. Each queue has a target worker expression that determines which workers are eligible to receive tasks from it.

### Manage Tasks

Create, read, update, cancel, or list tasks in a TaskRouter workspace. Tasks represent units of work that need to be routed to workers. You can create new tasks, update their attributes or priority, complete or cancel them, and filter the task list by status or assignment.

### Manage Workers

Create, read, update, delete, or list workers (agents) in a TaskRouter workspace. Workers represent the agents who handle tasks in your Flex contact center. You can update their attributes, activity status, and availability.

### Manage Workflows

Create, read, update, delete, or list workflows in a TaskRouter workspace. Workflows define the routing rules that determine how tasks are assigned to workers based on task attributes and queue configurations.

### Send Conversation Message

Send a message in a Twilio Conversation. Supports text messages and can optionally specify the author identity. Use this to programmatically send messages within an active conversation thread.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
