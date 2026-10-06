import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { resolveWorkspaceId, workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

const integrationSummary = (integrations: Record<string, Record<string, unknown>>) =>
  Object.fromEntries(
    Object.entries(integrations).map(([alias, integration]) => [
      alias,
      {
        integrationId: integration.id as string,
        name: integration.name as string,
        enabled: integration.enabled as boolean,
        status: integration.status as string
      }
    ])
  );

export let manageBotTool = SlateTool.create(spec, {
  name: 'Manage Bot',
  key: 'manage_bot',
  description: `Create, retrieve, update, or delete a Botpress bot. Use **action** to specify the operation. For updates, provide only the fields you want to change. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      workspaceId: workspaceIdSchema,
      botId: z.string().optional().describe('Bot ID (required for get, update, delete)'),
      name: z.string().optional().describe('Bot name (for create or update)'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value tags to associate with the bot'),
      blocked: z.boolean().optional().describe('Whether to block the bot (update only)'),
      states: z
        .record(
          z.string(),
          z.object({
            type: z.enum(['conversation', 'user', 'bot']),
            schema: z.record(z.string(), z.unknown()),
            expiry: z.number().min(1).optional()
          })
        )
        .optional()
        .describe(
          'State definitions for create or update. State names must be declared before manage_state can write them.'
        ),
      events: z
        .record(
          z.string(),
          z.object({
            schema: z.record(z.string(), z.unknown()),
            title: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('Custom event definitions for create or update.'),
      integrations: z
        .record(
          z.string(),
          z
            .object({
              integrationId: z.string().optional(),
              enabled: z.boolean().optional(),
              configuration: z.record(z.string(), z.unknown()).optional()
            })
            .nullable()
        )
        .optional()
        .describe(
          'Installed integrations to configure during update, keyed by instance alias. Discover definitions with list_integrations. Set an entry to null to uninstall it.'
        )
    })
  )
  .output(
    z.object({
      botId: z.string().optional(),
      name: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      status: z.string().optional(),
      deleted: z.boolean().optional(),
      tags: z.record(z.string(), z.string()).optional(),
      blocked: z.boolean().optional(),
      integrations: z
        .record(
          z.string(),
          z.object({
            integrationId: z.string(),
            name: z.string(),
            enabled: z.boolean(),
            status: z.string()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: resolveWorkspaceId(ctx.input.workspaceId, ctx.config)
    });

    if (ctx.input.action === 'create') {
      let result = await client.createBot({
        name: ctx.input.name,
        tags: ctx.input.tags,
        states: ctx.input.states,
        events: ctx.input.events
      });
      let bot = result.bot;
      return {
        output: {
          botId: bot.id,
          name: bot.name,
          createdAt: bot.createdAt,
          updatedAt: bot.updatedAt,
          status: bot.status,
          tags: bot.tags,
          blocked: bot.blocked,
          integrations: integrationSummary(bot.integrations ?? {})
        },
        message: `Created bot **${bot.name || bot.id}**.`
      };
    }

    if (!ctx.input.botId) {
      throw createApiServiceError('botId is required for get, update, and delete actions');
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
          status: bot.status,
          tags: bot.tags,
          blocked: bot.blocked,
          integrations: integrationSummary(bot.integrations ?? {})
        },
        message: `Retrieved bot **${bot.name || bot.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;
      if (ctx.input.blocked !== undefined) updateData.blocked = ctx.input.blocked;
      if (ctx.input.states !== undefined) updateData.states = ctx.input.states;
      if (ctx.input.events !== undefined) updateData.events = ctx.input.events;
      if (ctx.input.integrations !== undefined)
        updateData.integrations = ctx.input.integrations;
      if (Object.keys(updateData).length === 0)
        throw createApiServiceError('Provide at least one bot field to update.');

      let result = await client.updateBot(ctx.input.botId, updateData);
      let bot = result.bot;
      return {
        output: {
          botId: bot.id,
          name: bot.name,
          createdAt: bot.createdAt,
          updatedAt: bot.updatedAt,
          status: bot.status,
          tags: bot.tags,
          blocked: bot.blocked,
          integrations: integrationSummary(bot.integrations ?? {})
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

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
