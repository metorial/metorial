import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Lists work order categories from MaintainX. Categories help classify work orders according to organizational needs. Use category names when creating or updating work orders.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results per page (1-200, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            categoryId: z.number().describe('Category ID'),
            name: z.string().optional().describe('Category name')
          })
        )
        .describe('List of categories'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listCategories({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let categories = (result.categories ?? []).map((c: any) => ({
      categoryId: c.id,
      name: c.name
    }));

    return {
      output: {
        categories,
        nextCursor: result.nextCursor ?? undefined
      },
      message: `Found **${categories.length}** categor${categories.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
