import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotebooks = SlateTool.create(spec, {
  name: 'List Notebooks',
  key: 'list_notebooks',
  description: `List all OneNote notebooks accessible by the authenticated user. Supports filtering, sorting, and pagination via OData query parameters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('OData filter expression, e.g. "displayName eq \'My Notebook\'"'),
      orderBy: z
        .string()
        .optional()
        .describe('OData orderby expression, e.g. "createdDateTime desc"'),
      top: z.number().optional().describe('Maximum number of notebooks to return'),
      skip: z.number().optional().describe('Number of notebooks to skip for pagination')
    })
  )
  .output(
    z.object({
      notebooks: z.array(
        z.object({
          notebookId: z.string(),
          displayName: z.string(),
          createdDateTime: z.string(),
          lastModifiedDateTime: z.string(),
          isDefault: z.boolean(),
          isShared: z.boolean()
        })
      ),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listNotebooks({
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    return {
      output: {
        notebooks: result.notebooks.map(nb => ({
          notebookId: nb.notebookId,
          displayName: nb.displayName,
          createdDateTime: nb.createdDateTime,
          lastModifiedDateTime: nb.lastModifiedDateTime,
          isDefault: nb.isDefault,
          isShared: nb.isShared
        })),
        nextLink: result.nextLink
      },
      message: `Found **${result.notebooks.length}** notebook(s).`
    };
  })
  .build();
