import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageFavorites = SlateTool.create(spec, {
  name: 'Manage Favorites',
  key: 'manage_favorites',
  description: `List, add, or remove favorites for a user. Supports workbooks, views, data sources, projects, and flows.`
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Operation to perform'),
      userId: z.string().describe('User LUID'),
      resourceType: z
        .enum(['workbook', 'view', 'datasource', 'project', 'flow'])
        .optional()
        .describe('Type of resource (for add/remove)'),
      resourceId: z.string().optional().describe('LUID of the resource (for add/remove)'),
      label: z.string().optional().describe('Label for the favorite (for add)')
    })
  )
  .output(
    z.object({
      favorites: z.any().optional().describe('User favorites list'),
      added: z.boolean().optional(),
      removed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, userId } = ctx.input;

    if (action === 'list') {
      let result = await client.getFavorites(userId);
      return {
        output: { favorites: result.favorites },
        message: `Retrieved favorites for user \`${userId}\`.`
      };
    }

    if (action === 'add') {
      if (!ctx.input.resourceType) {
        throw tableauServiceError('resourceType is required for add action.');
      }
      if (!ctx.input.resourceId) {
        throw tableauServiceError('resourceId is required for add action.');
      }

      await client.addFavorite(
        userId,
        ctx.input.resourceType,
        ctx.input.resourceId,
        ctx.input.label || ctx.input.resourceType
      );
      return {
        output: { added: true },
        message: `Added ${ctx.input.resourceType} \`${ctx.input.resourceId}\` to favorites.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.resourceType) {
        throw tableauServiceError('resourceType is required for remove action.');
      }
      if (!ctx.input.resourceId) {
        throw tableauServiceError('resourceId is required for remove action.');
      }

      await client.deleteFavorite(userId, `${ctx.input.resourceType}s`, ctx.input.resourceId);
      return {
        output: { removed: true },
        message: `Removed ${ctx.input.resourceType} \`${ctx.input.resourceId}\` from favorites.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
