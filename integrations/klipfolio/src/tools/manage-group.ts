import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Manage group membership and default dashboards. Add or remove users from a group, and configure which dashboards are automatically assigned to new group members.`,
  instructions: [
    'Provide a groupId and use the available fields to add/remove users and manage default tabs.',
    'Default tab visibility options: "library" (visible in library), "dashboard" (visible on dashboard), "permanent" (always visible).'
  ]
})
  .input(
    z.object({
      groupId: z.string().describe('Group ID to manage'),
      addUserIds: z.array(z.string()).optional().describe('User IDs to add to the group'),
      removeUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to remove from the group'),
      addDefaultTabs: z
        .array(
          z.object({
            tabId: z.string().describe('Dashboard (tab) ID'),
            canEdit: z.boolean().optional().describe('Whether members can edit the dashboard'),
            visibility: z
              .enum(['library', 'dashboard', 'permanent'])
              .optional()
              .describe('Dashboard visibility level'),
            index: z.number().optional().describe('Position index for the dashboard')
          })
        )
        .optional()
        .describe('Default dashboards to add for the group'),
      removeDefaultTabIds: z.array(z.string()).optional().describe('Default tab IDs to remove')
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

    if (ctx.input.addUserIds) {
      for (let userId of ctx.input.addUserIds) {
        await client.addUserToGroupDirect(ctx.input.groupId, userId);
      }
      actions.push(`added ${ctx.input.addUserIds.length} user(s)`);
    }

    if (ctx.input.removeUserIds) {
      for (let userId of ctx.input.removeUserIds) {
        await client.removeUserFromGroupDirect(ctx.input.groupId, userId);
      }
      actions.push(`removed ${ctx.input.removeUserIds.length} user(s)`);
    }

    if (ctx.input.addDefaultTabs) {
      for (let tab of ctx.input.addDefaultTabs) {
        await client.addGroupDefaultTab(ctx.input.groupId, tab);
      }
      actions.push(`added ${ctx.input.addDefaultTabs.length} default dashboard(s)`);
    }

    if (ctx.input.removeDefaultTabIds) {
      for (let defaultTabId of ctx.input.removeDefaultTabIds) {
        await client.deleteGroupDefaultTab(ctx.input.groupId, defaultTabId);
      }
      actions.push(`removed ${ctx.input.removeDefaultTabIds.length} default dashboard(s)`);
    }

    return {
      output: { success: true },
      message: `Group \`${ctx.input.groupId}\`: ${actions.join(', ') || 'no changes made'}.`
    };
  })
  .build();
