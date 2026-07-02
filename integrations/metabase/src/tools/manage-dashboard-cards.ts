import { SlateTool } from 'slates';
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
    destructive: false,
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
      row: z.number().optional().describe('Row position on the dashboard grid (default: 0)'),
      col: z
        .number()
        .optional()
        .describe('Column position on the dashboard grid (default: 0)'),
      sizeX: z.number().optional().describe('Width in grid units (default: 6)'),
      sizeY: z.number().optional().describe('Height in grid units (default: 4)'),
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
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'add') {
      let result = await client.addCardToDashboard(ctx.input.dashboardId, {
        cardId: ctx.input.cardId!,
        row: ctx.input.row,
        col: ctx.input.col,
        sizeX: ctx.input.sizeX,
        sizeY: ctx.input.sizeY,
        parameterMappings: ctx.input.parameterMappings
      });

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
