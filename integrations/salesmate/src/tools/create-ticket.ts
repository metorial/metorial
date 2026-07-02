import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new support ticket in Salesmate. Tickets represent customer support cases and progress through pipeline stages. They can be linked to contacts and companies.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Ticket title (required)'),
      owner: z.number().describe('User ID of the ticket owner'),
      pipeline: z.string().optional().describe('Ticket pipeline name'),
      stage: z.string().optional().describe('Pipeline stage name'),
      status: z.string().optional().describe('Ticket status (e.g., "Open", "Closed")'),
      priority: z
        .string()
        .optional()
        .describe('Priority level (e.g., "High", "Medium", "Low")'),
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
      ticketId: z.number().describe('ID of the created ticket')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { customFields, ...fields } = ctx.input;
    let data = { ...fields, ...customFields };
    let result = await client.createTicket(data);
    let ticketId = result?.Data?.id;

    return {
      output: { ticketId },
      message: `Ticket **${ctx.input.title}** created with ID \`${ticketId}\`.`
    };
  })
  .build();
