import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageDashboardCards = SlateTool.create(spec, {
  name: 'Manage Dashboard Cards',
  key: 'manage_dashboard_cards',
  description: `Add or remove question cards from a dashboard.
When adding a card, you can specify its position and size on the dashboard grid.
Parameter mappings allow you to connect dashboard filters to the card's parameters.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove a card'),
      dashboardId: z.number().describe('ID of the dashboard'),
      cardId: z
        .number()
        .optional()
        .describe('ID of the question/card to add (required for add)'),
      dashcardId: z
        .number()
        .optional()
        .describe('ID of the dashcard to remove (required for remove)'),
      row: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Row position on the dashboard grid (default: 0)'),
      col: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Column position on the dashboard grid (default: 0)'),
      sizeX: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Width in grid units (default: 6)'),
      sizeY: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Height in grid units (default: 4)'),
      dashboardTabId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Dashboard tab ID for the new card. When omitted on a tabbed dashboard, the first tab is used.'
        ),
      parameterMappings: z
        .array(z.any())
        .optional()
        .describe('Parameter mappings connecting dashboard filters to card parameters')
    })
  )
  .output(
    z.object({
      dashboardId: z.number().describe('ID of the dashboard'),
      dashcardId: z.number().optional().describe('ID of the dashcard that was added'),
      cardId: z.number().optional().describe('ID of the question/card'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'add' && ctx.input.cardId === undefined) {
      throw createApiServiceError('Adding a dashboard card requires cardId.', {
        reason: 'metabase_dashcard_card_id_missing'
      });
    }
    if (ctx.input.action === 'remove' && ctx.input.dashcardId === undefined) {
      throw createApiServiceError('Removing a dashboard card requires dashcardId.', {
        reason: 'metabase_dashcard_id_missing'
      });
    }
    let client = new MetabaseClient(ctx.auth);

    if (ctx.input.action === 'add') {
      let result = await client.addCardToDashboard(ctx.input.dashboardId, {
        cardId: ctx.input.cardId!,
        row: ctx.input.row,
        col: ctx.input.col,
        sizeX: ctx.input.sizeX,
        sizeY: ctx.input.sizeY,
        dashboardTabId: ctx.input.dashboardTabId,
        parameterMappings: ctx.input.parameterMappings
      });
      if (typeof result?.id !== 'number') {
        throw createApiServiceError('Metabase did not return the newly created dashcard ID.', {
          reason: 'metabase_dashcard_response_invalid'
        });
      }

      return {
        output: {
          dashboardId: ctx.input.dashboardId,
          dashcardId: result.id,
          cardId: ctx.input.cardId,
          success: true
        },
        message: `Added card ${ctx.input.cardId} to dashboard ${ctx.input.dashboardId}`
      };
    } else {
      await client.removeCardFromDashboard(ctx.input.dashboardId, ctx.input.dashcardId!);

      return {
        output: {
          dashboardId: ctx.input.dashboardId,
          success: true
        },
        message: `Removed dashcard ${ctx.input.dashcardId} from dashboard ${ctx.input.dashboardId}`
      };
    }
  })
  .build();
