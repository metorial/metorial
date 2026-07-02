import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Create, update, or delete a contact group. Groups are used to organize contacts for targeted voice and text broadcasting.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('The operation to perform.'),
      groupId: z.string().optional().describe('Required for update and delete actions.'),
      name: z
        .string()
        .optional()
        .describe('Group name. Required for create, optional for update.')
    })
  )
  .output(
    z.object({
      groupId: z.string().optional(),
      name: z.string().optional(),
      contactsCount: z.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, groupId, name } = ctx.input;

    if (action === 'delete') {
      if (!groupId) throw new Error('groupId is required for delete action');
      await client.deleteGroup(groupId);
      return {
        output: { groupId },
        message: `Group \`${groupId}\` deleted successfully.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required for create action');
      let result = await client.createGroup({ name });
      return {
        output: {
          groupId: result.id,
          name: result.name,
          contactsCount: result.contacts_count,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Group **${result.name}** created with ID \`${result.id}\`.`
      };
    }

    // update
    if (!groupId) throw new Error('groupId is required for update action');
    if (!name) throw new Error('name is required for update action');
    let result = await client.updateGroup(groupId, { name });
    return {
      output: {
        groupId: result.id,
        name: result.name,
        contactsCount: result.contacts_count,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Group \`${groupId}\` updated to **${name}**.`
    };
  })
  .build();
