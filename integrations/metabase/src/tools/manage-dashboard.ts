import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageDashboard = SlateTool.create(spec, {
  name: 'Manage Dashboard',
  key: 'manage_dashboard',
  description: `Create, update, retrieve, copy, or archive a dashboard in Metabase.
Dashboards organize questions (cards) into a visual layout. Use this to manage dashboard properties like name, description, collection, and parameters.
Set **archived** to true to move a dashboard to the trash.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'copy']).describe('The action to perform'),
      dashboardId: z
        .number()
        .optional()
        .describe('ID of the dashboard (required for get, update, and copy)'),
      name: z.string().optional().describe('Name of the dashboard (required for create)'),
      description: z.string().optional().describe('Description of the dashboard'),
      collectionId: z
        .number()
        .nullable()
        .optional()
        .describe('Collection ID to place the dashboard in, or null for root'),
      parameters: z
        .array(z.any())
        .optional()
        .describe('Dashboard filter parameters configuration'),
      archived: z
        .boolean()
        .optional()
        .describe('Set to true to archive (trash) the dashboard'),
      enableEmbedding: z
        .boolean()
        .optional()
        .describe('Enable or disable embedding for the dashboard')
    })
  )
  .output(
    z.object({
      dashboardId: z.number().describe('ID of the dashboard'),
      name: z.string().describe('Name of the dashboard'),
      description: z.string().nullable().describe('Description of the dashboard'),
      archived: z.boolean().describe('Whether the dashboard is archived'),
      collectionId: z.number().nullable().describe('Collection ID'),
      creatorId: z.number().optional().describe('ID of the dashboard creator'),
      createdAt: z.string().optional().describe('When the dashboard was created'),
      updatedAt: z.string().optional().describe('When the dashboard was last updated'),
      cardCount: z.number().optional().describe('Number of cards on the dashboard')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let dashboard: any;

    if (ctx.input.action === 'create') {
      dashboard = await client.createDashboard({
        name: ctx.input.name!,
        description: ctx.input.description,
        collectionId: ctx.input.collectionId,
        parameters: ctx.input.parameters
      });
    } else if (ctx.input.action === 'update') {
      dashboard = await client.updateDashboard(ctx.input.dashboardId!, {
        name: ctx.input.name,
        description: ctx.input.description,
        collectionId: ctx.input.collectionId,
        parameters: ctx.input.parameters,
        archived: ctx.input.archived,
        enableEmbedding: ctx.input.enableEmbedding
      });
    } else if (ctx.input.action === 'copy') {
      dashboard = await client.copyDashboard(ctx.input.dashboardId!, {
        name: ctx.input.name,
        description: ctx.input.description,
        collectionId: ctx.input.collectionId
      });
    } else {
      dashboard = await client.getDashboard(ctx.input.dashboardId!);
    }

    let cardCount = dashboard.dashcards?.length ?? dashboard.ordered_cards?.length;

    return {
      output: {
        dashboardId: dashboard.id,
        name: dashboard.name,
        description: dashboard.description ?? null,
        archived: dashboard.archived ?? false,
        collectionId: dashboard.collection_id ?? null,
        creatorId: dashboard.creator_id,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
        cardCount
      },
      message:
        ctx.input.action === 'create'
          ? `Created dashboard **${dashboard.name}** (ID: ${dashboard.id})`
          : ctx.input.action === 'update'
            ? `Updated dashboard **${dashboard.name}** (ID: ${dashboard.id})`
            : ctx.input.action === 'copy'
              ? `Copied dashboard to **${dashboard.name}** (ID: ${dashboard.id})`
              : `Retrieved dashboard **${dashboard.name}** (ID: ${dashboard.id})${cardCount !== undefined ? ` with ${cardCount} card(s)` : ''}`
    };
  })
  .build();
