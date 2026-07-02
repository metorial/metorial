import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExtras = SlateTool.create(spec, {
  name: 'List Extras',
  key: 'list_extras',
  description: `Retrieve all available extras (purchasable add-on services/items) for an event. Returns extra IDs, names, prices, and types.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event')
    })
  )
  .output(
    z.object({
      extras: z
        .array(
          z.object({
            extraId: z.number().describe('Extra ID'),
            name: z.string().describe('Extra name'),
            price: z.number().describe('Extra price'),
            type: z.string().describe('Extra type')
          })
        )
        .describe('List of available extras')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let extras = await client.listExtras(ctx.input.eventId);

    return {
      output: {
        extras: extras.map(e => ({
          extraId: e.id,
          name: e.name,
          price: e.price ?? 0,
          type: e.type ?? ''
        }))
      },
      message: `Found **${extras.length}** extra(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();

export let listExhibitorExtras = SlateTool.create(spec, {
  name: 'List Exhibitor Extras',
  key: 'list_exhibitor_extras',
  description: `Retrieve all extras assigned to a specific exhibitor, including quantities.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      exhibitorId: z.number().describe('ID of the exhibitor')
    })
  )
  .output(
    z.object({
      extras: z
        .array(
          z.object({
            extraId: z.number().describe('Extra ID'),
            name: z.string().describe('Extra name'),
            quantity: z.number().describe('Quantity assigned')
          })
        )
        .describe('Exhibitor extras')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let extras = await client.listExhibitorExtras(ctx.input.exhibitorId);

    return {
      output: {
        extras: extras.map(e => ({
          extraId: e.extraId,
          name: e.name,
          quantity: e.quantity
        }))
      },
      message: `Found **${extras.length}** extra(s) for exhibitor ${ctx.input.exhibitorId}.`
    };
  })
  .build();

export let manageExhibitorExtra = SlateTool.create(spec, {
  name: 'Manage Exhibitor Extra',
  key: 'manage_exhibitor_extra',
  description: `Add or remove an extra for an exhibitor. Use "add" to assign an extra with a specific quantity, or "remove" to unassign it.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the extra'),
      exhibitorId: z.number().describe('ID of the exhibitor'),
      extraId: z.number().describe('ID of the extra'),
      quantity: z.number().optional().describe('Quantity to assign (required when adding)')
    })
  )
  .output(
    z.object({
      exhibitorId: z.number().describe('Exhibitor ID'),
      extraId: z.number().describe('Extra ID'),
      action: z.string().describe('Action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, exhibitorId, extraId, quantity } = ctx.input;

    if (action === 'add') {
      await client.addExhibitorExtra(exhibitorId, extraId, quantity ?? 1);
    } else {
      await client.removeExhibitorExtra(exhibitorId, extraId);
    }

    return {
      output: {
        exhibitorId,
        extraId,
        action
      },
      message:
        action === 'add'
          ? `Added extra **${extraId}** (qty: ${quantity ?? 1}) to exhibitor **${exhibitorId}**.`
          : `Removed extra **${extraId}** from exhibitor **${exhibitorId}**.`
    };
  })
  .build();
