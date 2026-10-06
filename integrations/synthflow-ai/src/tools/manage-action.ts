import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { paginationSchema } from '../lib/schemas';
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
        .describe(
          'Provider action body keyed by its type, for example {CUSTOM_ACTION: {name, http_mode, url}}. Use variables_during_the_call for custom action variables.'
        ),
      includeAssistants: z
        .boolean()
        .optional()
        .describe('Include assigned assistant IDs (get)'),
      limit: z.number().int().positive().optional().describe('Pagination limit (for list)'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Pagination offset (for list)')
    })
  )
  .output(
    z.object({
      action: z.record(z.string(), z.any()).optional().describe('Action details'),
      actions: z.array(z.record(z.string(), z.any())).optional().describe('List of actions'),
      actionId: z.string().optional().describe('Created/updated action ID'),
      attached: z.boolean().optional().describe('Whether actions were attached'),
      detached: z.boolean().optional().describe('Whether actions were detached'),
      deleted: z.boolean().optional().describe('Whether the action was deleted'),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { operation, actionId, agentId, actionIds, actionConfig } = ctx.input;

    if (operation === 'create') {
      if (!actionConfig || !Object.keys(actionConfig).length)
        throw createApiServiceError(
          'actionConfig is required for create operation. Use a documented action type such as CUSTOM_ACTION.'
        );
      let result = await client.createAction(actionConfig);
      let response = result.response || {};
      if (!response.action_id)
        throw createApiServiceError('Synthflow did not return the created action ID.');
      return {
        output: { actionId: response.action_id, action: response },
        message: `Created action \`${response.action_id}\` (${response.action_type || 'custom'}).`
      };
    }

    if (operation === 'get') {
      if (!actionId) throw createApiServiceError('actionId is required for get operation');
      let result = await client.getAction(actionId, ctx.input.includeAssistants);
      let actions = result.response?.actions;
      let action = Array.isArray(actions)
        ? actions.find(item => item?.action_id === actionId)
        : undefined;
      if (!action)
        throw createApiServiceError('Synthflow did not return the requested action.');
      return {
        output: { action, actionId },
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
        output: {
          actions: Array.isArray(actions) ? actions : [],
          pagination: result.response?.pagination
            ? {
                totalRecords: result.response.pagination.total_records,
                limit: result.response.pagination.limit,
                offset: result.response.pagination.offset
              }
            : undefined
        },
        message: `Found ${Array.isArray(actions) ? actions.length : 0} action(s).`
      };
    }

    if (operation === 'update') {
      if (!actionId) throw createApiServiceError('actionId is required for update operation');
      if (!actionConfig || !Object.keys(actionConfig).length)
        throw createApiServiceError('actionConfig is required for update operation');
      await client.updateAction(actionId, actionConfig);
      let result = await client.getAction(actionId);
      let actions = result.response?.actions;
      let action = Array.isArray(actions)
        ? actions.find(item => item?.action_id === actionId)
        : undefined;
      if (!action) throw createApiServiceError('Synthflow did not return the updated action.');
      return {
        output: { action, actionId },
        message: `Updated action \`${actionId}\`.`
      };
    }

    if (operation === 'delete') {
      if (!actionId) throw createApiServiceError('actionId is required for delete operation');
      await client.deleteAction(actionId);
      return {
        output: { deleted: true },
        message: `Deleted action \`${actionId}\`.`
      };
    }

    if (operation === 'attach') {
      if (!agentId) throw createApiServiceError('agentId is required for attach operation');
      if (!actionIds || actionIds.length === 0)
        throw createApiServiceError('actionIds are required for attach operation');
      await client.attachActions(agentId, actionIds);
      return {
        output: { attached: true },
        message: `Attached ${actionIds.length} action(s) to agent \`${agentId}\`.`
      };
    }

    if (operation === 'detach') {
      if (!agentId) throw createApiServiceError('agentId is required for detach operation');
      if (!actionIds || actionIds.length === 0)
        throw createApiServiceError('actionIds are required for detach operation');
      await client.detachActions(agentId, actionIds);
      return {
        output: { detached: true },
        message: `Detached ${actionIds.length} action(s) from agent \`${agentId}\`.`
      };
    }

    throw createApiServiceError(`Unknown operation: ${operation}`);
  })
  .build();
