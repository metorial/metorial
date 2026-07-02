import { SlateTool } from 'slates';
import { z } from 'zod';
import { StormboardClient } from '../lib/client';
import { spec } from '../spec';

export let manageStormStatus = SlateTool.create(spec, {
  name: 'Manage Storm Status',
  key: 'manage_storm_status',
  description: `Close, reopen, duplicate, favorite, or unfavorite a Storm. Closing a Storm makes it read-only; reopening restores full access. Duplicating creates a copy of the workspace.`
})
  .input(
    z.object({
      stormId: z.string().describe('ID of the Storm'),
      action: z
        .enum(['close', 'reopen', 'duplicate', 'favorite', 'unfavorite'])
        .describe('Action to perform on the Storm')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      result: z.any().optional().describe('Response data from the action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StormboardClient({ token: ctx.auth.token });
    let result: any;

    switch (ctx.input.action) {
      case 'close':
        result = await client.closeStorm(ctx.input.stormId);
        break;
      case 'reopen':
        result = await client.reopenStorm(ctx.input.stormId);
        break;
      case 'duplicate':
        result = await client.duplicateStorm(ctx.input.stormId);
        break;
      case 'favorite':
        result = await client.addFavorite(ctx.input.stormId);
        break;
      case 'unfavorite':
        result = await client.removeFavorite(ctx.input.stormId);
        break;
    }

    let actionLabels: Record<string, string> = {
      close: 'Closed',
      reopen: 'Reopened',
      duplicate: 'Duplicated',
      favorite: 'Favorited',
      unfavorite: 'Unfavorited'
    };

    return {
      output: {
        success: true,
        result
      },
      message: `${actionLabels[ctx.input.action]} Storm **${ctx.input.stormId}**.`
    };
  })
  .build();
