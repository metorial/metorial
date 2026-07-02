import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let manageCategoriesTool = SlateTool.create(spec, {
  name: 'Manage Categories',
  key: 'manage_categories',
  description: `Create, retrieve, list, or delete categories on a board. Categories help organize posts within a board and support parent-child nesting.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'retrieve', 'list', 'delete'])
        .describe('The action to perform'),
      boardId: z.string().optional().describe('Board ID (required for create and list)'),
      categoryId: z.string().optional().describe('Category ID (for retrieve or delete)'),
      name: z.string().optional().describe('Category name (for create)'),
      parentId: z.string().optional().describe('Parent category ID for nesting (for create)'),
      subscribeAdmins: z
        .boolean()
        .optional()
        .describe('Auto-subscribe admins to new posts (for create)'),
      limit: z.number().optional().describe('Number of categories to return (for list)'),
      skip: z.number().optional().describe('Number to skip for pagination (for list)')
    })
  )
  .output(
    z.object({
      category: z
        .object({
          categoryId: z.string(),
          name: z.string(),
          postCount: z.number().optional(),
          parentId: z.string().nullable().optional(),
          boardId: z.string().optional(),
          url: z.string().optional(),
          created: z.string().optional()
        })
        .optional()
        .describe('Category details (for create/retrieve)'),
      categories: z
        .array(
          z.object({
            categoryId: z.string(),
            name: z.string(),
            postCount: z.number(),
            parentId: z.string().nullable(),
            url: z.string(),
            created: z.string()
          })
        )
        .optional()
        .describe('List of categories (for list)'),
      hasMore: z
        .boolean()
        .optional()
        .describe('Whether more categories are available (for list)'),
      success: z.boolean().optional().describe('Whether deletion succeeded (for delete)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.boardId) throw new Error('boardId is required for create');
        if (!ctx.input.name) throw new Error('name is required for create');
        let result = await client.createCategory({
          boardID: ctx.input.boardId,
          name: ctx.input.name,
          parentID: ctx.input.parentId,
          subscribeAdmins: ctx.input.subscribeAdmins
        });
        return {
          output: {
            category: {
              categoryId: result.id,
              name: result.name,
              postCount: result.postCount,
              parentId: result.parentID || null,
              boardId: result.board?.id,
              url: result.url,
              created: result.created
            }
          },
          message: `Created category **"${ctx.input.name}"**.`
        };
      }

      case 'retrieve': {
        if (!ctx.input.categoryId) throw new Error('categoryId is required for retrieve');
        let cat = await client.retrieveCategory(ctx.input.categoryId);
        return {
          output: {
            category: {
              categoryId: cat.id,
              name: cat.name,
              postCount: cat.postCount,
              parentId: cat.parentID || null,
              boardId: cat.board?.id,
              url: cat.url,
              created: cat.created
            }
          },
          message: `Retrieved category **"${cat.name}"** with ${cat.postCount} post(s).`
        };
      }

      case 'list': {
        if (!ctx.input.boardId) throw new Error('boardId is required for list');
        let result = await client.listCategories({
          boardID: ctx.input.boardId,
          limit: ctx.input.limit,
          skip: ctx.input.skip
        });
        let categories = (result.categories || []).map((c: any) => ({
          categoryId: c.id,
          name: c.name,
          postCount: c.postCount,
          parentId: c.parentID || null,
          url: c.url,
          created: c.created
        }));
        return {
          output: { categories, hasMore: result.hasMore },
          message: `Found **${categories.length}** category(ies)${result.hasMore ? ' (more available)' : ''}.`
        };
      }

      case 'delete': {
        if (!ctx.input.categoryId) throw new Error('categoryId is required for delete');
        await client.deleteCategory(ctx.input.categoryId);
        return {
          output: { success: true },
          message: `Deleted category **${ctx.input.categoryId}**.`
        };
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  })
  .build();
