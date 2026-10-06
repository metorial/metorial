import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { idNumber, numericId, required } from '../lib/validation';
import { spec } from '../spec';

export let startStopRecipeTool = SlateTool.create(spec, {
  name: 'Start/Stop Recipe',
  key: 'start_stop_recipe',
  description: `Start or stop a Workato recipe. Also supports copying a recipe to a different folder, resetting the trigger cursor, or updating a recipe's connection.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['start', 'stop', 'copy', 'reset_trigger', 'update_connection'])
        .describe('Action to perform on the recipe'),
      recipeId: z.string().describe('ID of the recipe'),
      targetFolderId: z.string().optional().describe('Target folder ID (required for copy)'),
      adapterName: z
        .string()
        .optional()
        .describe('Adapter/connector name (required for update_connection)'),
      connectionId: z
        .number()
        .optional()
        .describe('Connection ID to assign (required for update_connection)')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      newRecipeId: z
        .number()
        .optional()
        .describe('ID of the copied recipe (only for copy action)')
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const { action, recipeId, targetFolderId, adapterName, connectionId } = ctx.input;
    if (action === 'copy') {
      const result = await client.copyRecipe(
        recipeId,
        numericId(targetFolderId, 'Non-Home target folder ID')
      );
      return {
        output: { success: true, newRecipeId: idNumber(result.new_flow_id) },
        message: `Copied recipe ${recipeId}.`
      };
    }
    if (action === 'start') await client.startRecipe(recipeId);
    if (action === 'stop') await client.stopRecipe(recipeId);
    if (action === 'reset_trigger') await client.resetRecipeTrigger(recipeId);
    if (action === 'update_connection')
      await client.updateRecipeConnection(
        recipeId,
        required(adapterName, 'Adapter name'),
        idNumber(numericId(connectionId, 'connectionId'))
      );
    return {
      output: { success: true },
      message: `Recipe ${action} accepted. Starting can execute jobs; resetting can replay events. Existing external effects are retained.`
    };
  });
