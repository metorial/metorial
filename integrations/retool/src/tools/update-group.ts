import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateGroup = SlateTool.create(spec, {
  name: 'Update Group',
  key: 'update_group',
  description: `Update a permission group's settings including name, universal access levels, and organizational permissions. Only provide the fields you want to change.`
})
  .input(
    z.object({
      groupId: z.number().describe('The numeric ID of the group to update'),
      groupName: z.string().optional().describe('New name for the group'),
      universalAppAccess: z
        .enum(['none', 'use', 'edit', 'own'])
        .optional()
        .describe('Default access level for all apps'),
      universalResourceAccess: z
        .enum(['none', 'user', 'admin'])
        .optional()
        .describe('Default access level for all resources'),
      universalWorkflowAccess: z
        .enum(['none', 'use', 'edit', 'own'])
        .optional()
        .describe('Default access level for all workflows'),
      universalQueryLibraryAccess: z
        .enum(['none', 'use', 'edit', 'own'])
        .optional()
        .describe('Default access level for the query library'),
      userListAccess: z
        .boolean()
        .optional()
        .describe('Whether group members can view the user list'),
      auditLogAccess: z
        .boolean()
        .optional()
        .describe('Whether group members can view the audit log'),
      unpublishedReleaseAccess: z
        .boolean()
        .optional()
        .describe('Whether group members can access unpublished releases'),
      usageAnalyticsAccess: z
        .boolean()
        .optional()
        .describe('Whether group members can view usage analytics'),
      themeAccess: z.boolean().optional().describe('Whether group members can manage themes'),
      accountDetailsAccess: z
        .boolean()
        .optional()
        .describe('Whether group members can view account details')
    })
  )
  .output(
    z.object({
      groupId: z.number(),
      groupName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.updateGroup(ctx.input.groupId, {
      name: ctx.input.groupName,
      universalAppAccess: ctx.input.universalAppAccess,
      universalResourceAccess: ctx.input.universalResourceAccess,
      universalWorkflowAccess: ctx.input.universalWorkflowAccess,
      universalQueryLibraryAccess: ctx.input.universalQueryLibraryAccess,
      userListAccess: ctx.input.userListAccess,
      auditLogAccess: ctx.input.auditLogAccess,
      unpublishedReleaseAccess: ctx.input.unpublishedReleaseAccess,
      usageAnalyticsAccess: ctx.input.usageAnalyticsAccess,
      themeAccess: ctx.input.themeAccess,
      accountDetailsAccess: ctx.input.accountDetailsAccess
    });

    let g = result.data;

    return {
      output: {
        groupId: g.id,
        groupName: g.name
      },
      message: `Updated group **${g.name}** (ID: \`${g.id}\`).`
    };
  })
  .build();
