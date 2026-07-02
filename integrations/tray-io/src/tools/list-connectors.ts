import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrayRestClient } from '../lib/client';
import { spec } from '../spec';

export let listConnectors = SlateTool.create(spec, {
  name: 'List Connectors',
  key: 'list_connectors',
  description: `List all available Tray.io connectors. Each connector represents a third-party service integration (e.g., Salesforce, Slack, Twilio). Returns connector names, versions, and descriptions needed for calling connector operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      connectors: z
        .array(
          z.object({
            connectorName: z
              .string()
              .describe('Programmatic name of the connector (e.g., "salesforce", "slack")'),
            version: z.string().describe('Connector version (e.g., "8.1")'),
            title: z.string().describe('Human-readable connector name'),
            description: z.string().describe('Description of the connector')
          })
        )
        .describe('List of available connectors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayRestClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let connectors = await client.listConnectors();

    return {
      output: { connectors },
      message: `Found **${connectors.length}** available connectors.`
    };
  })
  .build();
