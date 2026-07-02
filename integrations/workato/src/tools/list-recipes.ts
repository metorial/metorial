import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
          recipeId: z.number().describe('Recipe ID'),
          name: z.string().describe('Recipe name'),
          description: z.string().nullable().describe('Recipe description'),
          running: z.boolean().describe('Whether the recipe is currently running'),
          triggerApplication: z.string().nullable().describe('Trigger application name'),
          actionApplications: z.array(z.string()).describe('Action application names'),
          folderId: z.number().nullable().describe('Folder ID'),
          projectId: z.number().nullable().describe('Project ID'),
          jobSucceededCount: z.number().describe('Count of succeeded jobs'),
          jobFailedCount: z.number().describe('Count of failed jobs'),
          lastRunAt: z.string().nullable().describe('Last run timestamp'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      ),
      totalCount: z.number().describe('Total count of recipes matching the filter'),
      page: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listRecipes({
      folderId: ctx.input.folderId,
      running: ctx.input.running,
      adapterNamesAny: ctx.input.adapterNamesAny,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      order: ctx.input.order,
      updatedAfter: ctx.input.updatedAfter
    });

    let recipes = (result.items ?? []).map((r: any) => ({
      recipeId: r.id,
      name: r.name,
      description: r.description ?? null,
      running: r.running ?? false,
      triggerApplication: r.trigger_application ?? null,
      actionApplications: r.action_applications ?? [],
      folderId: r.folder_id ?? null,
      projectId: r.project_id ?? null,
      jobSucceededCount: r.job_succeeded_count ?? 0,
      jobFailedCount: r.job_failed_count ?? 0,
      lastRunAt: r.last_run_at ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));

    return {
      output: {
        recipes,
        totalCount: result.count ?? recipes.length,
        page: result.page ?? 1
      },
      message: `Found **${recipes.length}** recipes (page ${result.page ?? 1}).`
    };
  });
