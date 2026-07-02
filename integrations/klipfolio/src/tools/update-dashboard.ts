import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDashboard = SlateTool.create(spec, {
  name: 'Update Dashboard',
  key: 'update_dashboard',
  description: `Update a dashboard's name, description, layout, or klip instances. Can also manage share rights and add/remove klips from the dashboard.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dashboardId: z.string().describe('ID of the dashboard to update'),
      name: z.string().optional().describe('New name for the dashboard'),
      description: z.string().optional().describe('New description for the dashboard'),
      layout: z
        .object({
          type: z.string().describe('Layout type (e.g., "100", "30_60")'),
          state: z
            .record(z.string(), z.any())
            .describe('Layout state mapping klip instance IDs to regions')
        })
        .optional()
        .describe('Dashboard layout configuration'),
      addKlips: z
        .array(
          z.object({
            klipId: z.string().describe('ID of the klip to add'),
            region: z.number().optional().describe('Region number to place the klip'),
            position: z.number().optional().describe('Position within the region')
          })
        )
        .optional()
        .describe('Klips to add to the dashboard'),
      removeKlipInstanceIds: z
        .array(z.string())
        .optional()
        .describe('Klip instance IDs to remove from the dashboard'),
      shareRights: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID to share with'),
            canEdit: z.boolean().describe('Whether the group can edit')
          })
        )
        .optional()
        .describe('Share rights to set for the dashboard'),
      removeShareRightGroupIds: z
        .array(z.string())
        .optional()
        .describe('Group IDs to remove share rights for')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let actions: string[] = [];

    if (ctx.input.name !== undefined || ctx.input.description !== undefined) {
      await client.updateTab(ctx.input.dashboardId, {
        name: ctx.input.name,
        description: ctx.input.description
      });
      actions.push('updated properties');
    }

    if (ctx.input.layout) {
      await client.updateTabLayout(ctx.input.dashboardId, ctx.input.layout);
      actions.push('updated layout');
    }

    if (ctx.input.addKlips && ctx.input.addKlips.length > 0) {
      await client.addKlipsToTab(ctx.input.dashboardId, ctx.input.addKlips);
      actions.push(`added ${ctx.input.addKlips.length} klip(s)`);
    }

    if (ctx.input.removeKlipInstanceIds) {
      for (let instanceId of ctx.input.removeKlipInstanceIds) {
        await client.removeKlipFromTab(ctx.input.dashboardId, instanceId);
      }
      actions.push(`removed ${ctx.input.removeKlipInstanceIds.length} klip instance(s)`);
    }

    if (ctx.input.shareRights && ctx.input.shareRights.length > 0) {
      await client.updateTabShareRights(ctx.input.dashboardId, ctx.input.shareRights);
      actions.push('updated share rights');
    }

    if (ctx.input.removeShareRightGroupIds) {
      for (let groupId of ctx.input.removeShareRightGroupIds) {
        await client.deleteTabShareRight(ctx.input.dashboardId, groupId);
      }
      actions.push(`removed ${ctx.input.removeShareRightGroupIds.length} share right(s)`);
    }

    return {
      output: { success: true },
      message: `Dashboard \`${ctx.input.dashboardId}\`: ${actions.join(', ') || 'no changes made'}.`
    };
  })
  .build();
