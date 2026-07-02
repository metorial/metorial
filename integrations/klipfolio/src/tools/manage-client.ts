import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClient = SlateTool.create(spec, {
  name: 'Manage Client',
  key: 'manage_client',
  description: `Create, update, or delete a client account for agency/multi-tenant setups. Manage client properties and status.`,
  instructions: [
    'Use action "create" to add a new client, "update" to modify, or "delete" to remove.',
    'Client statuses include: active, trial, setup, disabled.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      clientId: z.string().optional().describe('Client ID (required for update and delete)'),
      name: z.string().optional().describe('Client name (required for create)'),
      description: z.string().optional().describe('Client description'),
      status: z.string().optional().describe('Client status (active, trial, setup, disabled)'),
      seats: z.number().optional().describe('Number of seats allocated to the client'),
      externalId: z.string().optional().describe('External identifier for the client')
    })
  )
  .output(
    z.object({
      clientId: z.string().optional(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required when creating a client');

      let result = await client.createClient({
        name: ctx.input.name,
        description: ctx.input.description,
        status: ctx.input.status,
        seats: ctx.input.seats,
        externalId: ctx.input.externalId
      });

      let location = result?.meta?.location;
      let clientId = location ? location.split('/').pop() : undefined;

      return {
        output: { clientId, success: true },
        message: `Created client **${ctx.input.name}**${clientId ? ` with ID \`${clientId}\`` : ''}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.clientId) throw new Error('clientId is required when updating');

      await client.updateClient(ctx.input.clientId, {
        name: ctx.input.name,
        description: ctx.input.description,
        status: ctx.input.status,
        seats: ctx.input.seats,
        externalId: ctx.input.externalId
      });

      return {
        output: { clientId: ctx.input.clientId, success: true },
        message: `Updated client \`${ctx.input.clientId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.clientId) throw new Error('clientId is required when deleting');
      await client.deleteClient(ctx.input.clientId);

      return {
        output: { clientId: ctx.input.clientId, success: true },
        message: `Deleted client \`${ctx.input.clientId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
