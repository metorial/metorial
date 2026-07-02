import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageState = SlateTool.create(spec, {
  name: 'Manage State',
  key: 'manage_state',
  description: `Read, write, or delete state data in Celigo. State is an API-only resource that stores arbitrary JSON data associated with a custom key.
Supports both **global** state (account-level) and **resource-specific** state (scoped to a flow, export, import, etc.). Commonly used to persist flow execution data between runs.`,
  instructions: [
    'For global state, omit resourceType and resourceId.',
    'For resource-specific state, provide both resourceType (e.g., "flows", "exports", "imports") and resourceId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list_keys', 'get', 'set', 'delete'])
        .describe('The operation to perform'),
      key: z.string().optional().describe('State key (required for get, set, delete)'),
      stateValue: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON data to store (required for set)'),
      resourceType: z
        .string()
        .optional()
        .describe(
          'Resource type for resource-specific state (e.g., "flows", "exports", "imports"). Omit for global state.'
        ),
      resourceId: z
        .string()
        .optional()
        .describe('Resource ID for resource-specific state. Omit for global state.')
    })
  )
  .output(
    z.object({
      keys: z
        .array(z.string())
        .optional()
        .describe('List of state keys (for list_keys action)'),
      stateValue: z.any().optional().describe('The state value (for get action)'),
      updated: z
        .boolean()
        .optional()
        .describe('Whether the state was updated (for set action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the state was deleted (for delete action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, key, stateValue, resourceType, resourceId } = ctx.input;
    let isResourceScoped = resourceType && resourceId;

    switch (action) {
      case 'list_keys': {
        let result: any;
        if (isResourceScoped) {
          result = await client.listResourceStateKeys(resourceType!, resourceId!);
        } else {
          result = await client.listGlobalStateKeys();
        }
        let keys = result.keys || [];
        return {
          output: { keys },
          message: `Found **${keys.length}** state key(s)${isResourceScoped ? ` for ${resourceType}/${resourceId}` : ' (global)'}.`
        };
      }
      case 'get': {
        if (!key) throw new Error('key is required for get');
        let result: any;
        if (isResourceScoped) {
          result = await client.getResourceState(resourceType!, resourceId!, key);
        } else {
          result = await client.getGlobalState(key);
        }
        return {
          output: { stateValue: result },
          message: `Retrieved state for key **${key}**${isResourceScoped ? ` (${resourceType}/${resourceId})` : ' (global)'}.`
        };
      }
      case 'set': {
        if (!key) throw new Error('key is required for set');
        if (!stateValue) throw new Error('stateValue is required for set');
        if (isResourceScoped) {
          await client.setResourceState(resourceType!, resourceId!, key, stateValue);
        } else {
          await client.setGlobalState(key, stateValue);
        }
        return {
          output: { updated: true },
          message: `Updated state for key **${key}**${isResourceScoped ? ` (${resourceType}/${resourceId})` : ' (global)'}.`
        };
      }
      case 'delete': {
        if (!key) throw new Error('key is required for delete');
        if (isResourceScoped) {
          await client.deleteResourceState(resourceType!, resourceId!, key);
        } else {
          await client.deleteGlobalState(key);
        }
        return {
          output: { deleted: true },
          message: `Deleted state for key **${key}**${isResourceScoped ? ` (${resourceType}/${resourceId})` : ' (global)'}.`
        };
      }
    }
  })
  .build();
