import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let manageClient = SlateTool.create(spec, {
  name: 'Manage Client',
  key: 'manage_client',
  description: `Create, update, or delete a client in Harvest. Clients are associated with projects and invoices.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      clientId: z.number().optional().describe('Client ID (required for update/delete)'),
      name: z.string().optional().describe('Client name (required for create)'),
      isActive: z.boolean().optional().describe('Whether the client is active'),
      address: z.string().optional().describe('Client address'),
      currency: z.string().optional().describe('Client currency code (e.g. USD, EUR)')
    })
  )
  .output(
    z.object({
      clientId: z.number().optional().describe('ID of the client'),
      name: z.string().optional().describe('Client name'),
      isActive: z.boolean().optional().describe('Whether active'),
      address: z.string().optional().nullable().describe('Client address'),
      currency: z.string().optional().describe('Currency code'),
      deleted: z.boolean().optional().describe('Whether the client was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.clientId) throw new Error('clientId is required for delete');
      await client.deleteClient(ctx.input.clientId);
      return {
        output: { clientId: ctx.input.clientId, deleted: true },
        message: `Deleted client **#${ctx.input.clientId}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create');
      let c = await client.createClient({
        name: ctx.input.name,
        isActive: ctx.input.isActive,
        address: ctx.input.address,
        currency: ctx.input.currency
      });
      return {
        output: {
          clientId: c.id,
          name: c.name,
          isActive: c.is_active,
          address: c.address,
          currency: c.currency
        },
        message: `Created client **${c.name}** (#${c.id}).`
      };
    }

    // update
    if (!ctx.input.clientId) throw new Error('clientId is required for update');
    let c = await client.updateClient(ctx.input.clientId, {
      name: ctx.input.name,
      isActive: ctx.input.isActive,
      address: ctx.input.address,
      currency: ctx.input.currency
    });
    return {
      output: {
        clientId: c.id,
        name: c.name,
        isActive: c.is_active,
        address: c.address,
        currency: c.currency
      },
      message: `Updated client **${c.name}** (#${c.id}).`
    };
  })
  .build();
