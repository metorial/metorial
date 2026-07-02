import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `Retrieve customer segments configured in Simla.com. Segments are used to categorize and group customers based on rules. Returns segment codes, names, and customer counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .object({
          active: z.boolean().optional().describe('Filter by active status'),
          ids: z.array(z.number()).optional().describe('Filter by segment IDs')
        })
        .optional()
        .describe('Filter criteria'),
      page: z.number().optional(),
      limit: z.number().optional()
    })
  )
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentId: z.number().optional(),
          code: z.string().optional(),
          name: z.string().optional(),
          active: z.boolean().optional(),
          isDynamic: z.boolean().optional(),
          customersCount: z.number().optional(),
          createdAt: z.string().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });

    let result = await client.getSegments(ctx.input.filter, ctx.input.page, ctx.input.limit);

    let segments = result.segments.map(s => ({
      segmentId: s.id,
      code: s.code,
      name: s.name,
      active: s.active,
      isDynamic: s.isDynamic,
      customersCount: s.customersCount,
      createdAt: s.createdAt
    }));

    return {
      output: {
        segments,
        totalCount: result.pagination.totalCount,
        currentPage: result.pagination.currentPage,
        totalPages: result.pagination.totalPageCount
      },
      message: `Found **${result.pagination.totalCount}** segments.`
    };
  })
  .build();
