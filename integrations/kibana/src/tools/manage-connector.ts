import { SlateTool } from 'slates';
import { z } from 'zod';
import { kibanaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let connectorOutputSchema = z.object({
  connectorId: z.string().describe('Unique ID of the connector'),
  name: z.string().describe('Name of the connector'),
  connectorTypeId: z
    .string()
    .describe(
      'Type ID of the connector (e.g., ".email", ".slack", ".webhook", ".pagerduty", ".jira")'
    ),
  isPreconfigured: z
    .boolean()
    .optional()
    .describe('Whether this is a preconfigured connector'),
  isDeprecated: z.boolean().optional().describe('Whether this connector type is deprecated'),
  isMissingSecrets: z
    .boolean()
    .optional()
    .describe('Whether the connector is missing secret configuration'),
  config: z
    .record(z.string(), z.any())
    .optional()
    .describe('Connector configuration (non-secret)'),
  deleted: z.boolean().optional().describe('Whether the connector was deleted')
});

export let listConnectors = SlateTool.create(spec, {
  name: 'List Connectors',
  key: 'list_connectors',
  description: `List all connectors configured in Kibana. Connectors integrate with external services like email, Slack, PagerDuty, webhook, Jira, ServiceNow, Microsoft Teams, and more.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      connectors: z.array(connectorOutputSchema).describe('List of connectors')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let connectors = await client.getConnectors();

    let mapped = connectors.map((c: any) => ({
      connectorId: c.id,
      name: c.name,
      connectorTypeId: c.connector_type_id,
      isPreconfigured: c.is_preconfigured,
      isDeprecated: c.is_deprecated,
      isMissingSecrets: c.is_missing_secrets,
      config: c.config
    }));

    return {
      output: { connectors: mapped },
      message: `Found **${mapped.length}** connectors.`
    };
  })
  .build();

export let manageConnector = SlateTool.create(spec, {
  name: 'Manage Connector',
  key: 'manage_connector',
  description: `Create, get, update, or delete a Kibana connector. Connectors integrate with external services for rule-triggered notifications.
Supported types include email, Slack, PagerDuty, webhook, Jira, ServiceNow, Microsoft Teams, Opsgenie, and more.`,
  instructions: [
    'To create a connector, provide name and connectorTypeId (e.g., ".email", ".slack", ".webhook").',
    'The config object contains non-secret configuration specific to the connector type.',
    'The secrets object contains sensitive values like API keys and passwords.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      connectorId: z
        .string()
        .optional()
        .describe('ID of the connector (required for get, update, delete)'),
      name: z.string().optional().describe('Name of the connector (required for create)'),
      connectorTypeId: z
        .string()
        .optional()
        .describe(
          'Connector type ID (e.g., ".email", ".slack", ".webhook", ".pagerduty", ".jira"). Required for create.'
        ),
      config: z
        .record(z.string(), z.any())
        .optional()
        .describe('Non-secret configuration for the connector'),
      secrets: z
        .record(z.string(), z.any())
        .optional()
        .describe('Secret configuration (e.g., API keys, passwords)')
    })
  )
  .output(connectorOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, connectorId, name, connectorTypeId, config, secrets } = ctx.input;

    if (action === 'get') {
      if (!connectorId) throw kibanaServiceError('connectorId is required for get action');
      let c = await client.getConnector(connectorId);
      return {
        output: {
          connectorId: c.id,
          name: c.name,
          connectorTypeId: c.connector_type_id,
          isPreconfigured: c.is_preconfigured,
          isDeprecated: c.is_deprecated,
          isMissingSecrets: c.is_missing_secrets,
          config: c.config
        },
        message: `Retrieved connector \`${c.name}\`.`
      };
    }

    if (action === 'create') {
      if (!name) throw kibanaServiceError('name is required for create action');
      if (!connectorTypeId)
        throw kibanaServiceError('connectorTypeId is required for create action');
      let c = await client.createConnector({ name, connectorTypeId, config, secrets });
      return {
        output: {
          connectorId: c.id,
          name: c.name,
          connectorTypeId: c.connector_type_id,
          isPreconfigured: c.is_preconfigured,
          isDeprecated: c.is_deprecated,
          config: c.config
        },
        message: `Created connector \`${c.name}\` with ID \`${c.id}\`.`
      };
    }

    if (action === 'update') {
      if (!connectorId) throw kibanaServiceError('connectorId is required for update action');
      let c = await client.updateConnector(connectorId, { name, config, secrets });
      return {
        output: {
          connectorId: c.id,
          name: c.name,
          connectorTypeId: c.connector_type_id,
          config: c.config
        },
        message: `Updated connector \`${connectorId}\`.`
      };
    }

    if (action === 'delete') {
      if (!connectorId) throw kibanaServiceError('connectorId is required for delete action');
      await client.deleteConnector(connectorId);
      return {
        output: {
          connectorId,
          name: '',
          connectorTypeId: '',
          deleted: true
        },
        message: `Deleted connector \`${connectorId}\`.`
      };
    }

    throw kibanaServiceError(`Unknown action: ${action}`);
  })
  .build();

export let executeConnector = SlateTool.create(spec, {
  name: 'Execute Connector',
  key: 'execute_connector',
  description: `Test or execute a Kibana connector with specific parameters. Useful for testing connector configuration or sending one-off notifications.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      connectorId: z.string().describe('ID of the connector to execute'),
      connectorParams: z
        .record(z.string(), z.any())
        .describe('Parameters for the connector execution (varies by connector type)')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Execution status ("ok" or "error")'),
      connectorId: z.string().describe('ID of the executed connector'),
      actionResponse: z
        .any()
        .optional()
        .describe('Response data from the connector execution'),
      message: z.string().optional().describe('Status message from the execution')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.executeConnector(
      ctx.input.connectorId,
      ctx.input.connectorParams
    );

    return {
      output: {
        status: result.status ?? 'unknown',
        connectorId: result.connector_id ?? ctx.input.connectorId,
        actionResponse: result.data,
        message: result.message
      },
      message: `Executed connector \`${ctx.input.connectorId}\` — status: **${result.status ?? 'unknown'}**.`
    };
  })
  .build();
