import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `List product categories from the CloudCart store. Results include the category hierarchy via parent IDs. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number to retrieve (1-based)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of categories per page (max 100)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (e.g. "order", "name")')
    })
  )
  .output(
    z.object({
      categories: z.array(
        z.object({
          categoryId: z.string(),
          name: z.string().optional(),
          parentId: z.any().optional(),
          description: z.string().optional(),
          urlHandle: z.string().optional(),
          order: z.any().optional(),
          dateModified: z.string().optional()
        })
      ),
      totalCount: z.number(),
      currentPage: z.number(),
      lastPage: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.config.domain });

    let res = await client.listCategories({
      pagination: { pageNumber: ctx.input.pageNumber, pageSize: ctx.input.pageSize },
      sort: ctx.input.sort
    });

    let categories = res.data.map(c => ({
      categoryId: c.id,
      name: c.attributes.name,
      parentId: c.attributes.parent_id,
      description: c.attributes.description,
      urlHandle: c.attributes.url_handle,
      order: c.attributes.order,
      dateModified: c.attributes.date_modified
    }));

    return {
      output: {
        categories,
        totalCount: res.meta.total,
        currentPage: res.meta['current-page'],
        lastPage: res.meta['last-page']
      },
      message: `Found **${res.meta.total}** categories (page ${res.meta['current-page']} of ${res.meta['last-page']}).`
    };
  })
  .build();
