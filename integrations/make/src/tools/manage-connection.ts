import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid } from '../lib/schemas';
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
      confirmed: z
        .boolean()
        .optional()
        .describe(
          'Explicitly acknowledge the provider confirmation for referenced resources or app installation; omission does not bypass it.'
        ),
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
    const client = clientFor(ctx);
    const { action, connectionId } = ctx.input;
    if (action === 'verify') {
      const result = await client.verifyConnection(connectionId);
      return {
        output: { connectionId, verified: result.verified },
        message: `Make reports connection verified: ${result.verified}. Verification can contact the linked third-party API.`
      };
    }
    if (action === 'delete') {
      await client.deleteConnection(connectionId, ctx.input.confirmed);
      return {
        output: { connectionId, deleted: true },
        message:
          'Make acknowledged exact connection deletion. Dependent scenarios can stop working; prior third-party effects remain.'
      };
    }
    if (action === 'rename' && ctx.input.name === undefined)
      throw invalid('name is required for rename.');
    const c = (
      action === 'get'
        ? await client.getConnection(connectionId)
        : await client.updateConnection(connectionId, { name: ctx.input.name! })
    ).connection;
    return {
      output: {
        connectionId: c.id,
        name: c.name,
        accountName: c.accountName ?? undefined,
        accountType: c.accountType ?? undefined
      },
      message: 'The exact native connection receipt was confirmed.'
    };
  })
  .build();
