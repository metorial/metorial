import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateServiceTicket = SlateTool.create(spec, {
  name: 'Update Service Ticket',
  key: 'update_service_ticket',
  description: `Update or complete an existing service ticket in AgencyZoom. Use action "update" to modify ticket fields like CSR assignment, category, priority, pipeline stage, or description. Use action "complete" to mark the ticket as completed with an optional resolution.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('ID of the service ticket to update or complete'),
      action: z
        .enum(['update', 'complete'])
        .describe(
          'Action to perform: "update" to modify ticket fields, "complete" to mark the ticket as completed'
        ),
      csrId: z.string().optional().describe('ID of the CSR to reassign the ticket to'),
      category: z.string().optional().describe('Updated service ticket category'),
      priority: z.string().optional().describe('Updated priority level'),
      pipelineId: z.string().optional().describe('Updated pipeline ID'),
      stageId: z.string().optional().describe('Updated pipeline stage ID'),
      resolution: z
        .string()
        .optional()
        .describe('Resolution for the ticket (typically used with action "complete")'),
      description: z.string().optional().describe('Updated description or details')
    })
  )
  .output(
    z.object({
      ticket: z.record(z.string(), z.any()).describe('The updated service ticket data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let data: Record<string, any> = {};
    if (ctx.input.csrId) data.csrId = ctx.input.csrId;
    if (ctx.input.category) data.category = ctx.input.category;
    if (ctx.input.priority) data.priority = ctx.input.priority;
    if (ctx.input.pipelineId) data.pipelineId = ctx.input.pipelineId;
    if (ctx.input.stageId) data.stageId = ctx.input.stageId;
    if (ctx.input.resolution) data.resolution = ctx.input.resolution;
    if (ctx.input.description) data.description = ctx.input.description;

    let result: any;

    if (ctx.input.action === 'complete') {
      result = await client.completeServiceTicket(ctx.input.ticketId, data);
    } else {
      result = await client.updateServiceTicket(ctx.input.ticketId, data);
    }

    let actionLabel = ctx.input.action === 'complete' ? 'Completed' : 'Updated';

    return {
      output: {
        ticket: result
      },
      message: `${actionLabel} service ticket **${ctx.input.ticketId}** successfully.`
    };
  })
  .build();
