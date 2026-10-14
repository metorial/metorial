import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createServiceTicket = SlateTool.create(spec, {
  name: 'Create Service Ticket',
  key: 'create_service_ticket',
  description: `Create a new service ticket in AgencyZoom. A service ticket tracks a customer service request or issue. AgencyZoom requires customerId, subject, category, priority, pipelineId, and stageId. Optionally assign a CSR and set description or tags.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to create the service ticket for'),
      subject: z
        .string()
        .optional()
        .describe('Service ticket summary. Required by AgencyZoom.'),
      csrId: z
        .string()
        .optional()
        .describe('ID of the CSR (customer service representative) to assign'),
      category: z
        .string()
        .optional()
        .describe(
          'Service ticket category. Use list-reference-data with dataType "service_categories" to get valid values.'
        ),
      priority: z
        .string()
        .optional()
        .describe(
          'Service ticket priority level. Use list-reference-data with dataType "service_priorities" to get valid values.'
        ),
      pipelineId: z
        .string()
        .optional()
        .describe(
          'Pipeline ID to associate the ticket with. Use list-reference-data with dataType "pipelines" to get valid values.'
        ),
      stageId: z
        .string()
        .optional()
        .describe(
          'Pipeline stage ID. Use list-reference-data with dataType "pipeline_stages" and a pipelineId to get valid values.'
        ),
      description: z
        .string()
        .optional()
        .describe('Description or details of the service ticket'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Array of tags to attach to the service ticket')
    })
  )
  .output(
    z.object({
      ticket: z.record(z.string(), z.any()).describe('The created service ticket data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let data: Record<string, any> = {
      customerId: ctx.input.customerId
    };
    if (ctx.input.subject !== undefined) data.subject = ctx.input.subject;
    if (ctx.input.csrId !== undefined) data.csrId = ctx.input.csrId;
    if (ctx.input.category !== undefined) data.category = ctx.input.category;
    if (ctx.input.priority !== undefined) data.priority = ctx.input.priority;
    if (ctx.input.pipelineId !== undefined) data.pipelineId = ctx.input.pipelineId;
    if (ctx.input.stageId !== undefined) data.stageId = ctx.input.stageId;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;

    let result = await client.createServiceTicket(data);

    let ticketId = result?.ticketId ?? result?.id ?? 'unknown';

    return {
      output: {
        ticket: result
      },
      message: `Successfully created service ticket **${ticketId}** for customer **${ctx.input.customerId}**.`
    };
  })
  .build();
