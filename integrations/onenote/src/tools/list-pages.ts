import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPages = SlateTool.create(spec, {
  name: 'List Pages',
  key: 'list_pages',
  description: `List all pages within a OneNote section. Returns page metadata including title, creation time, and ordering. Supports filtering, sorting, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sectionId: z.string().describe('The ID of the section to list pages from'),
      filter: z.string().optional().describe('OData filter expression'),
      orderBy: z
        .string()
        .optional()
        .describe('OData orderby expression, e.g. "lastModifiedDateTime desc"'),
      top: z.number().optional().describe('Maximum number of pages to return'),
      skip: z.number().optional().describe('Number of pages to skip for pagination')
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
          parentSectionId: z.string().optional(),
          level: z.number(),
          order: z.number()
        })
      ),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPages(ctx.input.sectionId, {
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    return {
      output: {
        pages: result.pages.map(p => ({
          pageId: p.pageId,
          title: p.title,
          createdDateTime: p.createdDateTime,
          lastModifiedDateTime: p.lastModifiedDateTime,
          parentSectionId: p.parentSectionId,
          level: p.level,
          order: p.order
        })),
        nextLink: result.nextLink
      },
      message: `Found **${result.pages.length}** page(s).`
    };
  })
  .build();
