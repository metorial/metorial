import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageConnection = SlateTool.create(spec, {
  name: 'Manage Connection',
  key: 'manage_connection',
  description: `Get details, rename, verify, or delete a connection. Use "verify" to test whether stored credentials are still valid with the external service.`,
  instructions: [
    'Provide a connectionId and the action to perform.',
    '"verify" tests if the connection credentials are valid with the external service.'
  ]
})
  .input(
    z.object({
      connectionId: z.number().describe('ID of the connection to manage'),
      action: z.enum(['get', 'rename', 'verify', 'delete']).describe('Action to perform'),
      name: z
        .string()
        .optional()
        .describe('New name for the connection (required for rename action)')
    })
  )
  .output(
    z.object({
      connectionId: z.number().optional().describe('Connection ID'),
      name: z.string().optional().describe('Connection name'),
      accountName: z.string().optional().describe('Account name'),
      accountType: z.string().optional().describe('Account type'),
      verified: z
        .boolean()
        .optional()
        .describe('Whether the connection is verified (for verify action)'),
      deleted: z.boolean().optional().describe('Whether the connection was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let { connectionId, action } = ctx.input;

    if (action === 'get') {
      let result = await client.getConnection(connectionId);
      let c = result.connection ?? result;
      return {
        output: {
          connectionId: c.id,
          name: c.name,
          accountName: c.accountName,
          accountType: c.accountType
        },
        message: `Connection **${c.name ?? c.accountName}** (ID: ${c.id}).`
      };
    }

    if (action === 'rename') {
      if (!ctx.input.name) {
        throw new Error('name is required for rename action');
      }
      let result = await client.renameConnection(connectionId, ctx.input.name);
      let c = result.connection ?? result;
      return {
        output: {
          connectionId: c.id ?? connectionId,
          name: c.name ?? ctx.input.name
        },
        message: `Connection ${connectionId} renamed to **${ctx.input.name}**.`
      };
    }

    if (action === 'verify') {
      let result = await client.verifyConnection(connectionId);
      let verified = result.verified ?? result;
      return {
        output: {
          connectionId,
          verified: Boolean(verified)
        },
        message: `Connection ${connectionId} verification: **${verified ? 'Valid' : 'Invalid'}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteConnection(connectionId, true);
      return {
        output: {
          connectionId,
          deleted: true
        },
        message: `Connection ${connectionId} **deleted**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
