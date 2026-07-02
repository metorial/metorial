import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { spec } from '../spec';

export let manageBotTool = SlateTool.create(spec, {
  name: 'Manage Bot',
  key: 'manage_bot',
  description: `Create, retrieve, update, or delete a Botpress bot. Use **action** to specify the operation. For updates, provide only the fields you want to change.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to config workspaceId.'),
      botId: z.string().optional().describe('Bot ID (required for get, update, delete)'),
      name: z.string().optional().describe('Bot name (for create or update)'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value tags to associate with the bot'),
      blocked: z.boolean().optional().describe('Whether to block the bot (update only)')
    })
  )
  .output(
    z.object({
      botId: z.string().optional(),
      name: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      status: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId || ctx.config.workspaceId
    });

    if (ctx.input.action === 'create') {
      let result = await client.createBot({
        name: ctx.input.name,
        tags: ctx.input.tags
      });
      let bot = result.bot;
      return {
        output: {
          botId: bot.id,
          name: bot.name,
          createdAt: bot.createdAt,
          updatedAt: bot.updatedAt,
          status: bot.status
        },
        message: `Created bot **${bot.name || bot.id}**.`
      };
    }

    if (!ctx.input.botId) {
      throw new Error('botId is required for get, update, and delete actions');
    }

    if (ctx.input.action === 'get') {
      let result = await client.getBot(ctx.input.botId);
      let bot = result.bot;
      return {
        output: {
          botId: bot.id,
          name: bot.name,
          createdAt: bot.createdAt,
          updatedAt: bot.updatedAt,
          status: bot.status
        },
        message: `Retrieved bot **${bot.name || bot.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;
      if (ctx.input.blocked !== undefined) updateData.blocked = ctx.input.blocked;

      let result = await client.updateBot(ctx.input.botId, updateData);
      let bot = result.bot;
      return {
        output: {
          botId: bot.id,
          name: bot.name,
          createdAt: bot.createdAt,
          updatedAt: bot.updatedAt,
          status: bot.status
        },
        message: `Updated bot **${bot.name || bot.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteBot(ctx.input.botId);
      return {
        output: {
          botId: ctx.input.botId,
          deleted: true
        },
        message: `Deleted bot **${ctx.input.botId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
