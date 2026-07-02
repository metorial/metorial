import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Create or Update Group',
  key: 'manage_group',
  description: `Create a new user group or update an existing one. Groups organize mobile workers for case sharing, reporting, and data access control.
To create, provide a name. To update, provide the groupId along with the fields to change.`,
  instructions: [
    'To create a new group, omit groupId and provide a name.',
    'To update an existing group, provide the groupId. Only include fields you want to change.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe('ID of an existing group to update. Omit to create a new group.'),
      name: z.string().optional().describe('Name for the group (required for creation)'),
      caseSharing: z
        .boolean()
        .optional()
        .describe('Whether the group shares cases between members'),
      reporting: z.boolean().optional().describe('Whether the group is used for reporting'),
      userIds: z
        .array(z.string())
        .optional()
        .describe('List of mobile worker user IDs to include in the group'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom group metadata as key-value pairs')
    })
  )
  .output(
    z.object({
      groupId: z.string(),
      groupName: z.string(),
      created: z.boolean(),
      userCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let isUpdate = !!ctx.input.groupId;

    if (isUpdate) {
      let result = await client.updateGroup(ctx.input.groupId!, {
        name: ctx.input.name,
        case_sharing: ctx.input.caseSharing,
        reporting: ctx.input.reporting,
        users: ctx.input.userIds,
        metadata: ctx.input.metadata
      });

      return {
        output: {
          groupId: result.id,
          groupName: result.name,
          created: false,
          userCount: result.users.length
        },
        message: `Updated group **${result.name}** with ${result.users.length} members.`
      };
    } else {
      if (!ctx.input.name) {
        throw new Error('Name is required to create a new group.');
      }

      let result = await client.createGroup({
        name: ctx.input.name,
        case_sharing: ctx.input.caseSharing,
        reporting: ctx.input.reporting,
        users: ctx.input.userIds,
        metadata: ctx.input.metadata
      });

      return {
        output: {
          groupId: result.id,
          groupName: result.name,
          created: true,
          userCount: result.users.length
        },
        message: `Created group **${result.name}** with ${result.users.length} members.`
      };
    }
  })
  .build();
