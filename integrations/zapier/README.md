# <img src="https://provider-logos.metorial-cdn.com/zapier-nla.svg" height="20"> Zapier

Programmatically manage automated workflows (Zaps) that connect thousands of cloud applications. Browse the app directory, create and configure multi-step Zaps with triggers and actions, manage user authentications for connected apps, retrieve Zap templates, and monitor Zap run history. Create workflow steps with webhook URLs for on-demand action execution. Supports embedded Zap editor integration and pre-filled Zap generation for seamless in-product automation experiences.

## Tools

### Create Authentication

Create a new authentication (connected account) for a Zapier app. This works for apps that support API key-based authentication. For OAuth-based apps, users must complete the authorization flow in a browser instead.

### Create Action Run

Run a single Zapier action asynchronously without creating a saved Zap. Returns an Action Run ID that can be checked with **Get Action Run**.

### Create Workflow Step

Create a standalone Workflow Step that returns a webhook URL for on-demand invocation. The webhook can be called with a POST request containing JSON data to execute the step and get a response. Field values can be hardcoded or use mapped values in double curly braces.

### Create Zap

Create a new Zap (automated workflow) with a specified title and steps. Each step requires an action ID, authentication ID, and input field values. Use the **List Actions** and **List Authentications** tools first to get valid action and authentication IDs, and **Get Action Input Fields** to discover required inputs for each step.

### Get Action Input Fields

Retrieve the input fields required for a specific action. Returns field definitions including types, labels, whether they're required, and available choices. Use this to discover what inputs are needed before creating a Zap step or testing an action. Some fields may depend on the values of other fields.

### Get Action Output Fields

Retrieve output fields produced by a specific action so later Zap steps can map data from that action.

### Get Action Run

Retrieve the status, results, and errors for an asynchronous Zapier Action Run.

### Get Input Field Choices

Retrieve available choices for a SELECT input field on a Zapier action, such as folders, sheets, channels, lists, or projects.

### Get Zap Runs

Retrieve execution history for Zaps. Returns details about individual Zap runs including status, timing, input/output data, and step results. Filter by Zap ID, date range, status, or search text to find specific runs.

### Get Zap Templates

Retrieve pre-built Zap templates that demonstrate popular automation workflows. Templates can be filtered by apps to find relevant automations. Use this to suggest popular automations to users or to discover common integration patterns.

### List Actions

Retrieve available actions (triggers, searches, and write actions) for a specific Zapier app. Each action represents an operation that can be used as a step in a Zap. Filter by action type to find triggers (READ), searches (SEARCH), or write actions (WRITE).

### List Apps

Browse and search the Zapier app directory. Returns apps available on Zapier's platform, sorted by popularity. Use this to discover which apps are available for building Zaps, filter by category, or search by name.

### List Authentications

Retrieve the user's existing authentications (connected accounts) for a specific Zapier app. Each authentication represents a saved set of credentials used to access a service. Use this to find authentication IDs required when creating Zap steps or testing actions.

### List Categories

Retrieve the list of all supported Zap categories on the Zapier platform. Categories organize apps by function (e.g., "Accounting", "AI Tools", "Analytics"). Use category slugs to filter apps in the **List Apps** tool.

### List Zaps

Retrieve a list of Zaps for the authenticated Zapier user. Returns Zap details including enabled/disabled status, last successful run date, step details, and editor links. Use the **expand** parameter to include full action and authentication objects instead of just IDs.

### Test Action Step

Test a configured Zapier action step with the provided authentication and inputs before creating a Zap.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
