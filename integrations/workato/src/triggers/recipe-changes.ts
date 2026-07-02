import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let recipeChangesTrigger = SlateTrigger.create(spec, {
  name: 'Recipe Changes',
  key: 'recipe_changes',
  description:
    'Triggers when recipes are created or updated in the workspace. Detects new recipes and modifications to existing ones.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      recipeId: z.number().describe('Recipe ID'),
      recipe: z.any().describe('Full recipe data')
    })
  )
  .output(
    z.object({
      recipeId: z.number().describe('Recipe ID'),
      name: z.string().describe('Recipe name'),
      description: z.string().nullable().describe('Recipe description'),
      running: z.boolean().describe('Whether the recipe is currently running'),
      triggerApplication: z.string().nullable().describe('Trigger application'),
      actionApplications: z.array(z.string()).describe('Action applications'),
      folderId: z.number().nullable().describe('Folder ID'),
      projectId: z.number().nullable().describe('Project ID'),
      versionNo: z.number().describe('Current version number'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let state = ctx.state as
        | { lastPollTime?: string; knownRecipeIds?: number[] }
        | undefined;
      let lastPollTime = state?.lastPollTime;
      let knownRecipeIds = state?.knownRecipeIds ?? [];

      let result = await client.listRecipes({
        updatedAfter: lastPollTime,
        perPage: 100,
        order: 'activity'
      });

      let items = result.items ?? [];
      let inputs: Array<{ changeType: 'created' | 'updated'; recipeId: number; recipe: any }> =
        [];
      let newKnownIds = [...knownRecipeIds];

      for (let recipe of items) {
        let isNew = !knownRecipeIds.includes(recipe.id);
        if (isNew) {
          newKnownIds.push(recipe.id);
        }
        // Only emit if this is a genuinely new/changed recipe since last poll
        if (lastPollTime) {
          inputs.push({
            changeType: isNew ? 'created' : 'updated',
            recipeId: recipe.id,
            recipe
          });
        }
      }

      // Keep known IDs list manageable
      if (newKnownIds.length > 10000) {
        newKnownIds = newKnownIds.slice(-5000);
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString(),
          knownRecipeIds: newKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let r = ctx.input.recipe;
      return {
        type: `recipe.${ctx.input.changeType}`,
        id: `recipe-${ctx.input.recipeId}-${r.updated_at ?? r.created_at}`,
        output: {
          recipeId: r.id,
          name: r.name,
          description: r.description ?? null,
          running: r.running ?? false,
          triggerApplication: r.trigger_application ?? null,
          actionApplications: r.action_applications ?? [],
          folderId: r.folder_id ?? null,
          projectId: r.project_id ?? null,
          versionNo: r.version_no ?? 1,
          createdAt: r.created_at,
          updatedAt: r.updated_at
        }
      };
    }
  });
