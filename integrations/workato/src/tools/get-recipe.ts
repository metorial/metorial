import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { malformed, numericId } from '../lib/validation';
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
      recipeId: z.number().optional().describe('Recipe ID'),
      name: z.string().optional().describe('Recipe name'),
      description: z.string().nullable().optional().describe('Recipe description'),
      running: z.boolean().optional().describe('Whether the recipe is currently running'),
      triggerApplication: z
        .string()
        .nullable()
        .optional()
        .describe('Trigger application name'),
      actionApplications: z.array(z.string()).optional().describe('Action application names'),
      folderId: z.number().nullable().optional().describe('Folder ID'),
      projectId: z.number().nullable().optional().describe('Project ID'),
      jobSucceededCount: z.number().optional().describe('Count of succeeded jobs'),
      jobFailedCount: z.number().optional().describe('Count of failed jobs'),
      lastRunAt: z.string().nullable().optional().describe('Last run timestamp'),
      stoppedAt: z.string().nullable().optional().describe('Stopped timestamp'),
      stopCause: z.string().nullable().optional().describe('Reason the recipe was stopped'),
      versionNo: z.number().optional().describe('Current version number'),
      code: z.string().nullable().optional().describe('Recipe code as JSON string'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = await client.getRecipe(ctx.input.recipeId);
    const output = map.recipeDetails(result);
    if (String(output.recipeId) !== numericId(ctx.input.recipeId, 'recipeId')) malformed();
    return { output, message: `Retrieved recipe ${output.recipeId}.` };
  });
