import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { field, records } from '../lib/validation';
import { spec } from '../spec';

export let listRecipesTool = SlateTool.create(spec, {
  name: 'List Recipes',
  key: 'list_recipes',
  description: `List automation recipes in the Workato workspace. Filter by folder, running state, or connected applications. Returns recipe metadata including name, status, trigger/action apps, and job counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Filter recipes by folder ID'),
      running: z
        .boolean()
        .optional()
        .describe('Filter by running state (true=running, false=stopped)'),
      adapterNamesAny: z
        .string()
        .optional()
        .describe('Comma-separated connector names to filter by (matches any)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max: 100)'),
      order: z.enum(['activity', 'default']).optional().describe('Sort order'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return recipes updated after this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      recipes: z.array(
        z.object({
          recipeId: z.number().optional().describe('Recipe ID'),
          name: z.string().optional().describe('Recipe name'),
          description: z.string().nullable().optional().describe('Recipe description'),
          running: z.boolean().optional().describe('Whether the recipe is currently running'),
          triggerApplication: z
            .string()
            .nullable()
            .optional()
            .describe('Trigger application name'),
          actionApplications: z
            .array(z.string())
            .optional()
            .describe('Action application names'),
          folderId: z.number().nullable().optional().describe('Folder ID'),
          projectId: z.number().nullable().optional().describe('Project ID'),
          jobSucceededCount: z.number().optional().describe('Count of succeeded jobs'),
          jobFailedCount: z.number().optional().describe('Count of failed jobs'),
          lastRunAt: z.string().nullable().optional().describe('Last run timestamp'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      totalCount: z.number().optional().describe('Total count of recipes matching the filter'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = await client.listRecipes(ctx.input);
    const recipes = records(result.items).map(map.recipe);
    return {
      output: {
        recipes,
        totalCount: field(result, 'count', z.number().int().nonnegative().optional()),
        page:
          field(result, 'page', z.number().int().positive().optional()) ?? ctx.input.page ?? 1
      },
      message: `Returned ${recipes.length} recipes from this page.`
    };
  });
