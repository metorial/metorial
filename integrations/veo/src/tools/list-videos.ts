import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVideos = SlateTool.create(spec, {
  name: 'List Videos',
  key: 'list_videos',
  description: `Retrieve a paginated list of videos from VEO. Can filter by videos you created or videos shared with you. Results are sorted by upload date by default.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      createdByMe: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          'If true, returns videos you created. If false, returns videos shared with you.'
        ),
      pageSize: z
        .number()
        .optional()
        .default(20)
        .describe('Number of videos per page (default 20)'),
      pageNumber: z
        .number()
        .optional()
        .default(1)
        .describe('Page number to retrieve (1-based)'),
      orderByDirection: z
        .enum(['ASC', 'DESC'])
        .optional()
        .default('DESC')
        .describe('Sort direction'),
      orderBy: z
        .string()
        .optional()
        .default('UPLOADEDSTAMP')
        .describe('Field to order by (e.g. UPLOADEDSTAMP)')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('List of video objects'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      totalItemCount: z.number().describe('Total number of videos matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.listVideos({
      createdByMe: ctx.input.createdByMe,
      pageSize: ctx.input.pageSize,
      pageNumber: ctx.input.pageNumber,
      orderByDirection: ctx.input.orderByDirection,
      orderBy: ctx.input.orderBy
    });

    let items = result.Items ?? result.items ?? [];
    let totalItemCount = result.TotalItemCount ?? result.totalItemCount ?? 0;
    let page = result.Page ?? result.page ?? ctx.input.pageNumber;
    let pageSize = result.PageSize ?? result.pageSize ?? ctx.input.pageSize;

    return {
      output: {
        items,
        page,
        pageSize,
        totalItemCount
      },
      message: `Retrieved **${items.length}** videos (page ${page}, ${totalItemCount} total).`
    };
  })
  .build();
