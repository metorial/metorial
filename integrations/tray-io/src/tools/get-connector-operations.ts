import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrayRestClient } from '../lib/client';
import { spec } from '../spec';

export let getConnectorOperations = SlateTool.create(spec, {
  name: 'Get Connector Operations',
  key: 'get_connector_operations',
  description: `Retrieve the available operations and their input/output schemas for a specific connector. Use this to discover what operations a connector supports and what parameters are required before calling it. Also returns service environments needed for authentication setup.`,
  instructions: [
    'Use the connector name and version from the "List Connectors" tool.',
    'The input/output schemas returned are JSON Schema objects that define required and optional parameters.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      connectorName: z
        .string()
        .describe('Programmatic name of the connector (e.g., "salesforce", "slack")'),
      version: z.string().describe('Connector version (e.g., "8.1")'),
      includeServiceEnvironments: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also return service environments for authentication setup')
    })
  )
  .output(
    z.object({
      operations: z
        .array(
          z.object({
            operationName: z
              .string()
              .describe('Programmatic operation name (e.g., "find_records", "send_message")'),
            title: z.string().describe('Human-readable operation name'),
            description: z.string().describe('Description of what the operation does'),
            inputSchema: z
              .any()
              .describe('JSON Schema defining the required and optional input parameters'),
            outputSchema: z.any().describe('JSON Schema defining the output structure'),
            hasDynamicOutput: z
              .boolean()
              .describe('Whether the output schema varies based on input')
          })
        )
        .describe('List of available operations'),
      serviceEnvironments: z
        .array(
          z.object({
            serviceEnvironmentId: z.string().describe('ID of the service environment'),
            title: z.string().describe('Name of the service environment'),
            scopes: z.array(z.any()).describe('Available OAuth scopes'),
            userData: z.any().nullable().describe('User data schema for authentication'),
            credentials: z.any().nullable().describe('Credentials schema for authentication')
          })
        )
        .optional()
        .describe('Service environments for authentication setup (only if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayRestClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let operations = await client.getConnectorOperations(
      ctx.input.connectorName,
      ctx.input.version
    );

    let serviceEnvironments: any[] | undefined;
    if (ctx.input.includeServiceEnvironments) {
      serviceEnvironments = await client.getServiceEnvironments(
        ctx.input.connectorName,
        ctx.input.version
      );
    }

    return {
      output: {
        operations,
        ...(serviceEnvironments ? { serviceEnvironments } : {})
      },
      message: `Found **${operations.length}** operations for connector **${ctx.input.connectorName}** v${ctx.input.version}.${serviceEnvironments ? ` Also retrieved ${serviceEnvironments.length} service environment(s).` : ''}`
    };
  })
  .build();
