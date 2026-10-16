import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { getTotalCount, requireRecords } from '../lib/response';
import { spec } from '../spec';

export let listGalleries = SlateTool.create(spec, {
  name: 'List Galleries',
  key: 'list_galleries',
  description: `List all media galleries in your Cincopa account. Returns gallery metadata including IDs, names, descriptions, item counts, and upload URLs. Supports pagination for large collections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search gallery metadata'),
      filterTags: z
        .string()
        .optional()
        .describe('Comma-separated tags; prefix a tag with - to exclude it'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of galleries per page')
    })
  )
  .output(
    z.object({
      galleries: z.array(z.record(z.string(), z.any())).describe('List of gallery objects'),
      totalCount: z.number().optional().describe('Total number of galleries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let data = await client.listGalleries({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      search: ctx.input.search,
      filterTags: ctx.input.filterTags
    });

    let galleries = requireRecords(data?.galleries ?? data?.items, 'gallery');
    let totalCount = getTotalCount(
      data?.items_data?.items_count,
      data?.total_count,
      data?.count
    );

    return {
      output: {
        galleries,
        totalCount
      },
      message: `Found **${galleries.length}** galleries on this page.`
    };
  })
  .build();
