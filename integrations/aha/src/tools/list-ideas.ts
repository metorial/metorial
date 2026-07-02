import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let listIdeas = SlateTool.create(spec, {
  name: 'List Ideas',
  key: 'list_ideas',
  description: `List ideas from Aha!, optionally filtered by product. You can also search ideas by keyword. Returns idea names, reference numbers, statuses, and vote counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().optional().describe('Filter by product ID or reference prefix'),
      searchTerm: z.string().optional().describe('Search ideas by keyword'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return ideas updated since this date (ISO 8601)'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      ideas: z.array(
        z.object({
          ideaId: z.string().describe('Idea ID'),
          referenceNum: z.string().describe('Idea reference number'),
          name: z.string().describe('Idea name'),
          status: z.string().optional().describe('Workflow status name'),
          numEndorsements: z.number().optional().describe('Number of votes/endorsements'),
          url: z.string().optional().describe('Aha! URL'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      totalRecords: z.number().describe('Total number of ideas'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);

    let result: any;
    if (ctx.input.searchTerm && ctx.input.productId) {
      result = await client.searchIdeas(ctx.input.productId, ctx.input.searchTerm, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    } else {
      result = await client.listIdeas({
        productId: ctx.input.productId,
        updatedSince: ctx.input.updatedSince,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
    }

    let ideas = result.ideas.map((i: any) => ({
      ideaId: i.id,
      referenceNum: i.reference_num,
      name: i.name,
      status: i.workflow_status?.name,
      numEndorsements: i.num_endorsements,
      url: i.url,
      updatedAt: i.updated_at
    }));

    return {
      output: {
        ideas,
        totalRecords: result.pagination.total_records,
        totalPages: result.pagination.total_pages,
        currentPage: result.pagination.current_page
      },
      message: `Found **${result.pagination.total_records}** ideas (page ${result.pagination.current_page}/${result.pagination.total_pages}).`
    };
  })
  .build();
