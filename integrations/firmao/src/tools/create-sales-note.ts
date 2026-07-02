import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let createSalesNote = SlateTool.create(spec, {
  name: 'Create Sales Note',
  key: 'create_sales_note',
  description: `Create a sales note (note, meeting, or phone call record) in Firmao. Sales notes can be linked to customers and used to track interactions.`
})
  .input(
    z.object({
      description: z.string().describe('Note content/description'),
      type: z.enum(['NOTE', 'MEETING', 'CALL']).describe('Type of note'),
      customerId: z.number().optional().describe('Customer ID to associate'),
      date: z.string().optional().describe('Date of the note/meeting/call (ISO 8601)'),
      tagIds: z.array(z.number()).optional().describe('Tag IDs')
    })
  )
  .output(
    z.object({
      salesNoteId: z.number().describe('ID of the created sales note'),
      type: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      description: ctx.input.description,
      type: ctx.input.type
    };

    if (ctx.input.customerId !== undefined) body.customer = ctx.input.customerId;
    if (ctx.input.date) body.date = ctx.input.date;
    if (ctx.input.tagIds) body.tags = ctx.input.tagIds.map(id => ({ id }));

    let result = await client.create('salesnotes', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        salesNoteId: createdId,
        type: ctx.input.type
      },
      message: `Created ${ctx.input.type.toLowerCase()} sales note (ID: ${createdId}).`
    };
  })
  .build();
