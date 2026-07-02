import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing support ticket in Salesmate. Use this to change ticket status, priority, stage, or any other field.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the ticket to update'),
      title: z.string().optional().describe('Ticket title'),
      owner: z.number().optional().describe('User ID of the ticket owner'),
      pipeline: z.string().optional().describe('Pipeline name'),
      stage: z.string().optional().describe('Pipeline stage name'),
      status: z.string().optional().describe('Ticket status'),
      priority: z.string().optional().describe('Priority level'),
      description: z.string().optional().describe('Ticket description'),
      primaryContact: z.number().optional().describe('ID of the primary contact'),
      primaryCompany: z.number().optional().describe('ID of the primary company'),
      tags: z.string().optional().describe('Comma-separated tags'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('ID of the updated ticket')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { ticketId, customFields, ...fields } = ctx.input;

    let updateData: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }
    if (customFields) {
      Object.assign(updateData, customFields);
    }

    await client.updateTicket(ticketId, updateData);

    return {
      output: { ticketId },
      message: `Ticket \`${ticketId}\` updated successfully.`
    };
  })
  .build();
