import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createServiceTicket = SlateTool.create(spec, {
  name: 'Create Service Ticket',
  key: 'create_service_ticket',
  description: `Create a new service ticket in AgencyZoom. A service ticket tracks a customer service request or issue. Requires a customer ID; optionally assign a CSR, set category, priority, pipeline stage, description, and tags.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to create the service ticket for'),
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
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let data: Record<string, any> = {
      customerId: ctx.input.customerId
    };
    if (ctx.input.csrId) data.csrId = ctx.input.csrId;
    if (ctx.input.category) data.category = ctx.input.category;
    if (ctx.input.priority) data.priority = ctx.input.priority;
    if (ctx.input.pipelineId) data.pipelineId = ctx.input.pipelineId;
    if (ctx.input.stageId) data.stageId = ctx.input.stageId;
    if (ctx.input.description) data.description = ctx.input.description;
    if (ctx.input.tags) data.tags = ctx.input.tags;

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
