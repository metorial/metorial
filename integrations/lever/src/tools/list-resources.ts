import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid, page, pagination, text } from '../lib/contracts';
import { spec } from '../spec';
export const listResourcesTool = SlateTool.create(spec, {
  key: 'list_resources',
  name: 'List Resources',
  description:
    'Discover requisitions, opportunity interview panels or feedback templates for existing write workflows. Returns one page and the next cursor.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['requisitions', 'panels', 'feedbackTemplates']),
      opportunityId: z
        .string()
        .optional()
        .describe('Required only for panels; discover it with list_opportunities'),
      status: z
        .enum(['open', 'onHold', 'closed', 'draft'])
        .optional()
        .describe('Requisition status filter only'),
      requisitionCode: z
        .string()
        .optional()
        .describe('Exact external requisition code filter only'),
      limit: z.number().optional().describe('Page size from 1 to 100'),
      offset: z
        .string()
        .optional()
        .describe('Next cursor returned by the same resource listing')
    })
  )
  .output(
    z.object({
      resource: z.enum(['requisitions', 'panels', 'feedbackTemplates']),
      data: z.array(z.record(z.string(), z.unknown())),
      hasNext: z.boolean(),
      next: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const params = pagination(ctx.input);
    if (
      ctx.input.resource !== 'requisitions' &&
      (ctx.input.status !== undefined || ctx.input.requisitionCode !== undefined)
    )
      invalid('Requisition filters apply only to requisitions.');
    if (ctx.input.resource !== 'panels' && ctx.input.opportunityId !== undefined)
      invalid('opportunityId applies only to panels.');
    const opportunityId =
      ctx.input.resource === 'panels'
        ? id(ctx.input.opportunityId, 'Opportunity ID required for panels')
        : undefined;
    if (ctx.input.status !== undefined) params.status = ctx.input.status;
    if (ctx.input.requisitionCode !== undefined)
      params.requisition_code = text(ctx.input.requisitionCode, 'Requisition code');
    const client = new Client(ctx.auth);
    const result = page(
      await (ctx.input.resource === 'requisitions'
        ? client.listRequisitions(params)
        : ctx.input.resource === 'panels'
          ? client.listOpportunityPanels(opportunityId!, params)
          : client.listFeedbackTemplates(params))
    );
    for (const item of result.data) id(item.id, 'Returned resource ID');
    return {
      output: { resource: ctx.input.resource, ...result },
      message: `Retrieved ${result.data.length} ${ctx.input.resource}${result.hasNext ? '; more pages available' : ''}.`
    };
  })
  .build();
