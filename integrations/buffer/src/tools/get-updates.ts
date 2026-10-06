import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, projectUpdate } from '../lib/client';
import { pageInfoSchema, updateSchema } from '../lib/schemas';
import { spec } from '../spec';

export const getUpdatesTool = SlateTool.create(spec, {
  name: 'Get Updates',
  key: 'get_updates',
  description:
    'Read one update by ID or list posts for a profile or organization. Current connections support drafts and cursor pagination. Provider totals are returned only when supplied. Request metrics explicitly with a personal API key.',
  instructions: [
    'pending selects scheduled posts on the current API; sent selects published posts. draft requires a current connection.',
    'updateId selects one post and ignores list filters. Prefer after with the returned endCursor. Compatibility page traversal is bounded to 100 requests.',
    'The current API since filter matches createdAt or dueAt after the given date. Timestamps in the output are Unix seconds.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      profileId: z
        .string()
        .optional()
        .describe(
          'Profile/channel ID. Required for legacy lists; current connections can instead use organizationId.'
        ),
      updateId: z
        .string()
        .optional()
        .describe('Read exactly this update; list filters are ignored.'),
      status: z.enum(['pending', 'sent', 'draft']).default('pending'),
      page: z
        .number()
        .optional()
        .describe(
          'Positive page number starting at 1. On the current API this walks prior cursor pages; cannot be combined with after.'
        ),
      count: z.number().optional().describe('Positive number of records requested per page.'),
      since: z
        .string()
        .optional()
        .describe('Unix seconds or ISO timestamp for the provider since/startDate filter.'),
      utc: z
        .boolean()
        .optional()
        .describe(
          'Legacy timestamp option. Current API dates include timezone offsets and are converted to absolute Unix seconds.'
        ),
      organizationId: z
        .string()
        .optional()
        .describe(
          'Current API organization ID from Get Organizations. Inferred from profileId or a single accessible organization if omitted.'
        ),
      after: z
        .string()
        .optional()
        .describe('Opaque current API endCursor from the previous response.'),
      includeMetrics: z
        .boolean()
        .optional()
        .describe(
          'Explicitly read current aggregate post metrics; requires a personal API key and sent posts.'
        )
    })
  )
  .output(
    z.object({
      total: z
        .number()
        .optional()
        .describe(
          'Provider-supplied legacy matching total; omitted by the current post-list API.'
        ),
      returnedCount: z.number(),
      updates: z.array(updateSchema),
      pageInfo: pageInfoSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    if (ctx.input.updateId !== undefined) {
      const update = await client.getUpdate(ctx.input.updateId, ctx.input.includeMetrics);
      return {
        output: { returnedCount: 1, updates: [projectUpdate(update)] },
        message: `Retrieved Buffer update ${update.id}.`
      };
    }
    const result = await client.getUpdates(ctx.input.profileId, ctx.input.status, ctx.input);
    const updates = result.updates.map(projectUpdate);
    return {
      output: {
        total: result.total,
        returnedCount: updates.length,
        updates,
        pageInfo: result.pageInfo
      },
      message: `Retrieved ${updates.length} Buffer update(s).`
    };
  })
  .build();
