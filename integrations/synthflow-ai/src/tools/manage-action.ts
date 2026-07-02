import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAction = SlateTool.create(spec, {
  name: 'Manage Custom Action',
  key: 'manage_action',
  description: `Create, retrieve, update, delete, attach, or detach custom actions for agents. Custom actions extend agent capabilities by integrating external APIs — pull live information, create records, or adjust conversational flow.

Use the **operation** field to choose what to do. For "attach" and "detach", provide an agent ID and a list of action IDs.`,
  instructions: [
    'For "create", provide the full action configuration in actionConfig.',
    'For "attach"/"detach", provide the agentId and actionIds.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'get', 'list', 'update', 'delete', 'attach', 'detach'])
        .describe('Operation to perform'),
      actionId: z.string().optional().describe('Action ID (required for get, update, delete)'),
      agentId: z.string().optional().describe('Agent model ID (required for attach/detach)'),
      actionIds: z.array(z.string()).optional().describe('Action IDs to attach or detach'),
      actionConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full action configuration object (for create/update)'),
      limit: z.number().optional().describe('Pagination limit (for list)'),
      offset: z.number().optional().describe('Pagination offset (for list)')
    })
  )
  .output(
    z.object({
      action: z.record(z.string(), z.any()).optional().describe('Action details'),
      actions: z.array(z.record(z.string(), z.any())).optional().describe('List of actions'),
      actionId: z.string().optional().describe('Created/updated action ID'),
      attached: z.boolean().optional().describe('Whether actions were attached'),
      detached: z.boolean().optional().describe('Whether actions were detached'),
      deleted: z.boolean().optional().describe('Whether the action was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { operation, actionId, agentId, actionIds, actionConfig } = ctx.input;

    if (operation === 'create') {
      if (!actionConfig) throw new Error('actionConfig is required for create operation');
      let result = await client.createAction(actionConfig);
      let response = result.response || {};
      return {
        output: { actionId: response.action_id, action: response },
        message: `Created action \`${response.action_id}\` (${response.action_type || 'custom'}).`
      };
    }

    if (operation === 'get') {
      if (!actionId) throw new Error('actionId is required for get operation');
      let result = await client.getAction(actionId);
      return {
        output: { action: result.response || result },
        message: `Retrieved action \`${actionId}\`.`
      };
    }

    if (operation === 'list') {
      let result = await client.listActions({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let actions = result.response?.actions || result.response || [];
      return {
        output: { actions: Array.isArray(actions) ? actions : [] },
        message: `Found ${Array.isArray(actions) ? actions.length : 0} action(s).`
      };
    }

    if (operation === 'update') {
      if (!actionId) throw new Error('actionId is required for update operation');
      if (!actionConfig) throw new Error('actionConfig is required for update operation');
      let result = await client.updateAction(actionId, actionConfig);
      return {
        output: { action: result.response || result, actionId },
        message: `Updated action \`${actionId}\`.`
      };
    }

    if (operation === 'delete') {
      if (!actionId) throw new Error('actionId is required for delete operation');
      await client.deleteAction(actionId);
      return {
        output: { deleted: true },
        message: `Deleted action \`${actionId}\`.`
      };
    }

    if (operation === 'attach') {
      if (!agentId) throw new Error('agentId is required for attach operation');
      if (!actionIds || actionIds.length === 0)
        throw new Error('actionIds are required for attach operation');
      await client.attachActions(agentId, actionIds);
      return {
        output: { attached: true },
        message: `Attached ${actionIds.length} action(s) to agent \`${agentId}\`.`
      };
    }

    if (operation === 'detach') {
      if (!agentId) throw new Error('agentId is required for detach operation');
      if (!actionIds || actionIds.length === 0)
        throw new Error('actionIds are required for detach operation');
      await client.detachActions(agentId, actionIds);
      return {
        output: { detached: true },
        message: `Detached ${actionIds.length} action(s) from agent \`${agentId}\`.`
      };
    }

    throw new Error(`Unknown operation: ${operation}`);
  })
  .build();
