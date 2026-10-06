import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieve detailed information about a specific permission group, including its members and access settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('The numeric ID of the group to retrieve'),
      excludeDisabledUsers: z
        .boolean()
        .optional()
        .describe('Whether to exclude disabled users from the members list')
    })
  )
  .output(
    z.object({
      groupId: z.number().nullable(),
      legacyGroupId: z.number().nullable().optional(),
      groupName: z.string(),
      universalAppAccess: z.string().optional(),
      universalResourceAccess: z.string().optional(),
      universalWorkflowAccess: z.string().optional(),
      universalQueryLibraryAccess: z.string().optional(),
      members: z
        .array(
          z.object({
            userId: z.string(),
            isGroupAdmin: z.boolean(),
            email: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let result = await client.getGroup(ctx.input.groupId, ctx.input.excludeDisabledUsers);
    let g = result.data;

    let members = g.members?.map(m => ({
      userId: m.id,
      isGroupAdmin: m.is_group_admin,
      email: m.email
    }));

    return {
      output: {
        groupId: g.id,
        legacyGroupId: g.legacy_id,
        groupName: g.name,
        universalAppAccess: g.universal_app_access,
        universalResourceAccess: g.universal_resource_access,
        universalWorkflowAccess: g.universal_workflow_access,
        universalQueryLibraryAccess: g.universal_query_library_access,
        members
      },
      message: `Retrieved group **${g.name}** with ${members?.length ?? 0} members.`
    };
  })
  .build();
