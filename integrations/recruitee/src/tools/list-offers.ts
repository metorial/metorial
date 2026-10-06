import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';
export let listOffers = SlateTool.create(spec, {
  name: 'List Job Offers',
  key: 'list_offers',
  description:
    'List one page of job offers and talent pools, with current status and ID filters. Request subsequent pages to list the complete account.',
  instructions: [
    'kind, scope, and viewMode are deprecated provider filters retained for existing calls. Prefer statuses and current ID filters. Basic list responses may omit kind, creation time, and department name; Get Job Offer returns full details.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      kind: z
        .enum(['job', 'talent_pool'])
        .optional()
        .describe('Deprecated provider kind filter, retained for existing calls'),
      scope: z
        .string()
        .optional()
        .describe(
          'Deprecated: active means published and closed, archived means archived, not_archived means all except archived. Do not combine with statuses'
        ),
      viewMode: z
        .string()
        .optional()
        .describe('Deprecated provider view_mode, retained only for compatibility'),
      page: z.number().optional().describe('One-based page, default 1'),
      limit: z.number().optional().describe('Page size from 1 to 1000, default 1000'),
      statuses: z
        .array(z.enum(['draft', 'published', 'internal', 'closed', 'archived']))
        .optional()
        .describe('Current status filter'),
      offerIds: z.array(z.number()).optional().describe('Exact offer IDs'),
      departmentIds: z.array(z.number()).optional().describe('Department IDs'),
      locationIds: z.array(z.number()).optional().describe('Location IDs')
    })
  )
  .output(
    z.object({
      offers: z.array(
        z.object({
          offerId: z.number(),
          title: z.string(),
          kind: z.string().optional(),
          status: z.string(),
          department: z.string().nullable(),
          createdAt: z.string().optional()
        })
      ),
      page: z.number().optional().describe('Actual provider page when metadata is returned'),
      limit: z
        .number()
        .optional()
        .describe('Actual provider page size when metadata is returned'),
      totalCount: z
        .number()
        .optional()
        .describe('Actual provider total count when metadata is returned'),
      hasMore: z
        .boolean()
        .optional()
        .describe('Derived only from actual provider pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    const client = await RecruiteeClient.forContext(ctx);
    const result = await client.listOffers(ctx.input);
    return {
      output: {
        offers: result.offers.map(o => ({
          offerId: o.id,
          title: o.title,
          kind: o.kind,
          status: o.status,
          department: o.department,
          createdAt: o.created_at
        })),
        ...(result.meta
          ? {
              ...result.meta,
              hasMore: result.meta.page * result.meta.limit < result.meta.totalCount
            }
          : {})
      },
      message: `Returned ${result.offers.length} offers.`
    };
  })
  .build();
