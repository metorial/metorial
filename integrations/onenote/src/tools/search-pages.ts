import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPages = SlateTool.create(spec, {
  name: 'Search Pages',
  key: 'search_pages',
  description: `Search OneNote pages accessible by the authenticated user. Searches page titles and can be scoped to a section for accounts with many sections.`,
  instructions: [
    'Provide sectionId when you know the section to search; Microsoft Graph can reject global page searches in accounts with many sections.',
    'Without sectionId, the search runs across accessible OneNote pages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The search query text'),
      sectionId: z
        .string()
        .optional()
        .describe('Optional section ID to search pages within a single section'),
      top: z.number().optional().describe('Maximum number of results to return'),
      skip: z.number().optional().describe('Number of results to skip for pagination'),
      filter: z.string().optional().describe('OData filter expression to narrow results')
    })
  )
  .output(
    z.object({
      pages: z.array(
        z.object({
          pageId: z.string(),
          title: z.string(),
          createdDateTime: z.string(),
          lastModifiedDateTime: z.string(),
          parentSectionId: z.string().optional()
        })
      ),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchPages(ctx.input.query, {
      sectionId: ctx.input.sectionId,
      top: ctx.input.top,
      skip: ctx.input.skip,
      filter: ctx.input.filter
    });

    return {
      output: {
        pages: result.pages.map(p => ({
          pageId: p.pageId,
          title: p.title,
          createdDateTime: p.createdDateTime,
          lastModifiedDateTime: p.lastModifiedDateTime,
          parentSectionId: p.parentSectionId
        })),
        nextLink: result.nextLink
      },
      message: `Found **${result.pages.length}** page(s) matching "${ctx.input.query}".`
    };
  })
  .build();
