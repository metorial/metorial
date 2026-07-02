import { SlateTool } from 'slates';
import { z } from 'zod';
import { RuntimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageUserTool = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Create, retrieve, update, delete, or list bot users via the Runtime API. Users represent people interacting with a bot within a specific integration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      userId: z.string().optional().describe('User ID (required for get, update, delete)'),
      name: z.string().optional().describe('User display name (for create or update)'),
      pictureUrl: z.string().optional().describe('User avatar URL (for create or update)'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags to associate with the user'),
      nextToken: z.string().optional().describe('Pagination token for list')
    })
  )
  .output(
    z.object({
      user: z
        .object({
          userId: z.string(),
          name: z.string().optional(),
          pictureUrl: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
          tags: z.record(z.string(), z.string()).optional()
        })
        .optional(),
      users: z
        .array(
          z.object({
            userId: z.string(),
            name: z.string().optional(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
        )
        .optional(),
      deleted: z.boolean().optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new RuntimeClient({ token: ctx.auth.token, botId });

    if (ctx.input.action === 'list') {
      let result = await client.listUsers({ nextToken: ctx.input.nextToken });
      let users = (result.users || []).map((u: Record<string, unknown>) => ({
        userId: u.id as string,
        name: u.name as string | undefined,
        createdAt: u.createdAt as string,
        updatedAt: u.updatedAt as string
      }));
      return {
        output: { users, nextToken: result.meta?.nextToken },
        message: `Found **${users.length}** user(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createUser({
        name: ctx.input.name,
        pictureUrl: ctx.input.pictureUrl,
        tags: ctx.input.tags
      });
      let u = result.user;
      return {
        output: {
          user: {
            userId: u.id,
            name: u.name,
            pictureUrl: u.pictureUrl,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            tags: u.tags
          }
        },
        message: `Created user **${u.name || u.id}**.`
      };
    }

    if (!ctx.input.userId)
      throw new Error('userId is required for get, update, and delete actions');

    if (ctx.input.action === 'get') {
      let result = await client.getUser(ctx.input.userId);
      let u = result.user;
      return {
        output: {
          user: {
            userId: u.id,
            name: u.name,
            pictureUrl: u.pictureUrl,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            tags: u.tags
          }
        },
        message: `Retrieved user **${u.name || u.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let updateData: { name?: string; pictureUrl?: string; tags?: Record<string, string> } =
        {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.pictureUrl !== undefined) updateData.pictureUrl = ctx.input.pictureUrl;
      if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;

      let result = await client.updateUser(ctx.input.userId, updateData);
      let u = result.user;
      return {
        output: {
          user: {
            userId: u.id,
            name: u.name,
            pictureUrl: u.pictureUrl,
            createdAt: u.createdAt,
            updatedAt: u.updatedAt,
            tags: u.tags
          }
        },
        message: `Updated user **${u.name || u.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteUser(ctx.input.userId);
      return {
        output: { deleted: true },
        message: `Deleted user **${ctx.input.userId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
