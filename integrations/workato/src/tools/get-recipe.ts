import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let getRecipeTool = SlateTool.create(spec, {
  name: 'Get Recipe',
  key: 'get_recipe',
  description: `Retrieve detailed information about a specific Workato recipe including its code, configuration, connected applications, job counts, and version info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recipeId: z.string().describe('ID of the recipe to retrieve')
    })
  )
  .output(
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
      stoppedAt: z.string().nullable().describe('Stopped timestamp'),
      stopCause: z.string().nullable().describe('Reason the recipe was stopped'),
      versionNo: z.number().describe('Current version number'),
      code: z.string().nullable().describe('Recipe code as JSON string'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let r = await client.getRecipe(ctx.input.recipeId);

    return {
      output: {
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
        stoppedAt: r.stopped_at ?? null,
        stopCause: r.stop_cause ?? null,
        versionNo: r.version_no ?? 1,
        code: r.code ?? null,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      },
      message: `Recipe **${r.name}** (ID: ${r.id}) — ${r.running ? '🟢 Running' : '🔴 Stopped'}`
    };
  });
