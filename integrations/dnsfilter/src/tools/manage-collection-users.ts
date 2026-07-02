import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollectionUsers = SlateTool.create(spec, {
  name: 'Manage Collection Users',
  key: 'manage_collection_users',
  description: `List, add, or remove users from a user collection. Collections are used for policy assignment - each user in a collection inherits the collection's assigned policy.
- **list**: Get all users in the collection.
- **add**: Add a user to the collection.
- **remove**: Remove a user from the collection.`
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Operation to perform'),
      collectionId: z.string().describe('Collection ID'),
      userId: z.string().optional().describe('User ID (required for add/remove)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional attributes (for add)')
    })
  )
  .output(
    z.object({
      users: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of users (for list)'),
      user: z.record(z.string(), z.any()).optional().describe('Added user details (for add)'),
      removed: z.boolean().optional().describe('Whether the user was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, collectionId, userId } = ctx.input;

    if (action === 'list') {
      let users = await client.listCollectionUsers(collectionId);
      return {
        output: { users },
        message: `Found **${users.length}** user(s) in collection **${collectionId}**.`
      };
    }

    if (action === 'add') {
      if (!userId) throw new Error('userId is required for add');
      let params: Record<string, any> = { user_id: userId };
      if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);
      let user = await client.addCollectionUser(collectionId, params);
      return {
        output: { user },
        message: `Added user **${userId}** to collection **${collectionId}**.`
      };
    }

    if (!userId) throw new Error('userId is required for remove');
    await client.removeCollectionUser(collectionId, userId);
    return {
      output: { removed: true },
      message: `Removed user **${userId}** from collection **${collectionId}**.`
    };
  })
  .build();
