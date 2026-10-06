import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid } from '../lib/contracts';
import { spec } from '../spec';
export const getResourceTool = SlateTool.create(spec, {
  key: 'get_resource',
  name: 'Get Resource',
  description:
    'Read one exact posting, user, requisition, interview or panel. Discover IDs with list_postings, list_users, list_resources or get_opportunity_activity.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['posting', 'user', 'requisition', 'interview', 'panel']),
      resourceId: z.string().describe('Exact resource ID returned by its discovery tool'),
      opportunityId: z
        .string()
        .optional()
        .describe(
          'Required for interview and panel reads; discover it with list_opportunities'
        )
    })
  )
  .output(
    z.object({
      resource: z.enum(['posting', 'user', 'requisition', 'interview', 'panel']),
      resourceId: z.string(),
      data: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    const resourceId = id(ctx.input.resourceId);
    const scoped = ctx.input.resource === 'interview' || ctx.input.resource === 'panel';
    if (!scoped && ctx.input.opportunityId !== undefined)
      invalid('opportunityId applies only to interviews and panels.');
    const opportunityId = scoped
      ? id(ctx.input.opportunityId, 'Opportunity ID required for this resource')
      : undefined;
    const client = new Client(ctx.auth);
    const result =
      ctx.input.resource === 'posting'
        ? await client.getPosting(resourceId)
        : ctx.input.resource === 'user'
          ? await client.getUser(resourceId)
          : ctx.input.resource === 'requisition'
            ? await client.getRequisition(resourceId)
            : ctx.input.resource === 'interview'
              ? await client.getInterview(opportunityId!, resourceId)
              : await client.getPanel(opportunityId!, resourceId);
    return {
      output: { resource: ctx.input.resource, resourceId, data: result.data },
      message: `Retrieved ${ctx.input.resource} ${resourceId}.`
    };
  })
  .build();
