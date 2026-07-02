import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let manageRecipeTool = SlateTool.create(spec, {
  name: 'Manage Recipe',
  key: 'manage_recipe',
  description: `Create, update, or delete a Workato recipe. When creating, provide a name and optionally recipe code and folder. When updating, provide the recipe ID and the fields to change. The recipe must be stopped to update it.`,
  instructions: [
    'To update a recipe, it must be stopped first. Use the Start/Stop Recipe tool if needed.',
    'Recipe code should be a valid JSON string representing the recipe logic.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      recipeId: z.string().optional().describe('Recipe ID (required for update/delete)'),
      name: z.string().optional().describe('Recipe name (required for create)'),
      description: z.string().optional().describe('Recipe description'),
      code: z.string().optional().describe('Recipe code as JSON string'),
      config: z.string().optional().describe('Recipe config as JSON string'),
      folderId: z.string().optional().describe('Folder ID to place the recipe in')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      recipeId: z.number().optional().describe('ID of the created/affected recipe')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      action,
      recipeId,
      name,
      description,
      code,
      config: recipeConfig,
      folderId
    } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a recipe');
      let result = await client.createRecipe({
        name,
        description,
        code,
        config: recipeConfig,
        folderId
      });
      return {
        output: { success: result.success ?? true, recipeId: result.id },
        message: `Created recipe **${name}** with ID ${result.id}.`
      };
    }

    if (!recipeId) throw new Error('Recipe ID is required for update/delete');

    if (action === 'update') {
      await client.updateRecipe(recipeId, {
        name,
        description,
        code,
        config: recipeConfig
      });
      return {
        output: { success: true, recipeId: Number(recipeId) },
        message: `Updated recipe **${recipeId}**.`
      };
    }

    // delete
    await client.deleteRecipe(recipeId);
    return {
      output: { success: true, recipeId: Number(recipeId) },
      message: `Deleted recipe **${recipeId}**.`
    };
  });
