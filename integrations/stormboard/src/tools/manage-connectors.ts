import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let manageConnectors = SlateTool.create(spec, {
  name: 'Manage Connectors',
  key: 'manage_connectors',
  description: `Create, update, or delete line connectors between ideas in a Storm. Connectors visualize relationships and dependencies between ideas. Use action "list" to retrieve all connectors, "create" to link two ideas, "update" to modify a connector label, or "delete" to remove a connector.`
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      connectorId: z
        .string()
        .optional()
        .describe('Connector ID (required for update and delete)'),
      fromIdeaId: z.string().optional().describe('Source idea ID (required for create)'),
      toIdeaId: z.string().optional().describe('Target idea ID (required for create)'),
      label: z
        .string()
        .optional()
        .describe('Label for the connector (used in create and update)')
    })
  )
  .output(
    z.object({
      connectors: z.array(z.any()).optional().describe('List of connectors (for list action)'),
      connector: z.any().optional().describe('Created or updated connector data'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let { stormId, action, connectorId, fromIdeaId, toIdeaId, label } = ctx.input;

    if (action === 'list') {
      let connectors = await client.listConnectors(stormId);
      let list = Array.isArray(connectors) ? connectors : [];
      return {
        output: { connectors: list, success: true },
        message: `Found **${list.length}** connector(s) in Storm ${stormId}.`
      };
    }

    if (action === 'create') {
      if (!fromIdeaId || !toIdeaId) {
        throw new Error('fromIdeaId and toIdeaId are required for creating a connector');
      }
      let connector = await client.createConnector(stormId, {
        from: fromIdeaId,
        to: toIdeaId,
        label
      });
      return {
        output: { connector, success: true },
        message: `Created connector from idea ${fromIdeaId} to idea ${toIdeaId}.`
      };
    }

    if (action === 'update') {
      if (!connectorId) {
        throw new Error('connectorId is required for updating a connector');
      }
      let connector = await client.updateConnector(stormId, connectorId, { label });
      return {
        output: { connector, success: true },
        message: `Updated connector ${connectorId}.`
      };
    }

    if (action === 'delete') {
      if (!connectorId) {
        throw new Error('connectorId is required for deleting a connector');
      }
      await client.deleteConnector(stormId, connectorId);
      return {
        output: { success: true },
        message: `Deleted connector ${connectorId}.`
      };
    }

    return {
      output: { success: false },
      message: 'Unknown action.'
    };
  })
  .build();
