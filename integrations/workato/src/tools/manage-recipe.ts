import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { idNumber, numericId, required } from '../lib/validation';
import { spec } from '../spec';

export let manageRecipeTool = SlateTool.create(spec, {
  name: 'Manage Recipe',
  key: 'manage_recipe',
  description: `Create, update, or delete a Workato recipe. When creating, provide a name, valid recipe code, and a non-Home folder ID. When updating, provide the recipe ID and the fields to change. The recipe must be stopped to update it.`,
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
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      recipeId: z.number().optional().describe('ID of the created/affected recipe')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const {
      action,
      recipeId,
      name,
      description,
      code,
      config: recipeConfig,
      folderId
    } = ctx.input;
    if (action === 'create') {
      const result = await client.createRecipe({
        name: required(name, 'Name'),
        description,
        code,
        config: recipeConfig,
        folderId
      });
      const id = idNumber(result.id);
      return { output: { success: true, recipeId: id }, message: `Created recipe ${id}.` };
    }
    const id = numericId(recipeId, 'recipeId');
    if (action === 'update')
      await client.updateRecipe(id, {
        name,
        description,
        code,
        config: recipeConfig,
        folderId
      });
    else await client.deleteRecipe(id);
    return {
      output: { success: true, recipeId: idNumber(id) },
      message: `Recipe ${action} accepted for ${id}.`
    };
  });
