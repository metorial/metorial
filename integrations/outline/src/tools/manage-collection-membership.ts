import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollectionMembership = SlateTool.create(spec, {
  name: 'Manage Collection Membership',
  key: 'manage_collection_membership',
  description: `Add or remove users and groups from a collection to control access permissions.
Supports granting read or read_write access at the user or group level.`
})
  .input(
    z.object({
      collectionId: z.string().describe('Collection ID'),
      action: z
        .enum(['add_user', 'remove_user', 'add_group', 'remove_group'])
        .describe('Membership action to perform'),
      userId: z
        .string()
        .optional()
        .describe('User ID (required for add_user and remove_user)'),
      groupId: z
        .string()
        .optional()
        .describe('Group ID (required for add_group and remove_group)'),
      permission: z
        .enum(['read', 'read_write'])
        .optional()
        .describe('Permission level to grant (for add actions)')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { collectionId, action, permission } = ctx.input;

    switch (action) {
      case 'add_user': {
        if (!ctx.input.userId) throw new Error('userId is required');
        await client.addUserToCollection(collectionId, ctx.input.userId, permission);
        break;
      }
      case 'remove_user': {
        if (!ctx.input.userId) throw new Error('userId is required');
        await client.removeUserFromCollection(collectionId, ctx.input.userId);
        break;
      }
      case 'add_group': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        await client.addGroupToCollection(collectionId, ctx.input.groupId, permission);
        break;
      }
      case 'remove_group': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        await client.removeGroupFromCollection(collectionId, ctx.input.groupId);
        break;
      }
    }

    return {
      output: {
        collectionId,
        action,
        success: true
      },
      message: `Successfully performed **${action}** on collection.`
    };
  })
  .build();
