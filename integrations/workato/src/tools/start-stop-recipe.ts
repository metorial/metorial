import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let startStopRecipeTool = SlateTool.create(spec, {
  name: 'Start/Stop Recipe',
  key: 'start_stop_recipe',
  description: `Start or stop a Workato recipe. Also supports copying a recipe to a different folder, resetting the trigger cursor, or updating a recipe's connection.`,
  tags: {
    destructive: false
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
      success: z.boolean().describe('Whether the operation succeeded'),
      newRecipeId: z
        .number()
        .optional()
        .describe('ID of the copied recipe (only for copy action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, recipeId, targetFolderId, adapterName, connectionId } = ctx.input;

    if (action === 'start') {
      await client.startRecipe(recipeId);
      return {
        output: { success: true },
        message: `Started recipe **${recipeId}**.`
      };
    }

    if (action === 'stop') {
      await client.stopRecipe(recipeId);
      return {
        output: { success: true },
        message: `Stopped recipe **${recipeId}**.`
      };
    }

    if (action === 'copy') {
      if (!targetFolderId) throw new Error('Target folder ID is required for copy');
      let result = await client.copyRecipe(recipeId, targetFolderId);
      return {
        output: { success: true, newRecipeId: result.new_flow_id },
        message: `Copied recipe **${recipeId}** to folder ${targetFolderId}. New recipe ID: **${result.new_flow_id}**.`
      };
    }

    if (action === 'reset_trigger') {
      await client.resetRecipeTrigger(recipeId);
      return {
        output: { success: true },
        message: `Reset trigger for recipe **${recipeId}**.`
      };
    }

    if (action === 'update_connection') {
      if (!adapterName || connectionId === undefined) {
        throw new Error('Adapter name and connection ID are required for update_connection');
      }
      await client.updateRecipeConnection(recipeId, adapterName, connectionId);
      return {
        output: { success: true },
        message: `Updated connection for recipe **${recipeId}**: ${adapterName} -> connection ${connectionId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
