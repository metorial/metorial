import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { formatTimestamp } from '../lib/output';
import { spec } from '../spec';

export let manageIntegrationTool = SlateTool.create(spec, {
  name: 'Manage Integration',
  key: 'manage_integration',
  description: `Create, update, delete, or fetch integrations (deployment channels). Integrations connect bots to platforms like Slack, Discord, WhatsApp, web widgets, Sitemap, Notion, and more. Each integration type has its own configuration.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'fetch']).describe('Action to perform'),
      integrationId: z
        .string()
        .optional()
        .describe('Integration ID (required for update, delete, fetch)'),
      type: z
        .string()
        .optional()
        .describe(
          'Channel type used for every action (e.g. widget, slack, discord, whatsapp, sitemap, notion, trigger, extract, support)'
        ),
      botId: z.string().optional().describe('Bot ID to connect the integration to'),
      name: z.string().optional().describe('Integration name'),
      description: z.string().optional().describe('Integration description'),
      settings: z
        .record(z.string(), z.any())
        .optional()
        .describe('Integration-specific settings'),
      meta: z.record(z.string(), z.any()).optional().describe('Arbitrary metadata')
    })
  )
  .output(
    z.object({
      integrationId: z.string().describe('Integration ID'),
      type: z.string().optional().describe('Integration type'),
      botId: z.string().optional().describe('Connected bot ID'),
      name: z.string().optional().describe('Integration name'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { action, integrationId, type, botId, name, description, settings, meta } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = {};
      if (type) data.type = type;
      if (botId) data.botId = botId;
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (settings) Object.assign(data, settings);
      if (type !== undefined) data.type = type;
      if (meta) data.meta = meta;
      let result = await client.createIntegration(data);
      return {
        output: {
          integrationId: result.id,
          type: result.type ?? type,
          botId: result.botId ?? botId,
          name: result.name ?? name,
          createdAt: formatTimestamp(result.createdAt)
        },
        message: `Integration **${result.name || result.id}** (${result.type || type}) created.`
      };
    }

    if (action === 'fetch') {
      if (!integrationId) throw createApiServiceError('integrationId is required for fetch');
      let result = await client.fetchIntegration(integrationId, type);
      return {
        output: {
          integrationId: result.id,
          type: result.type ?? type,
          botId: result.botId ?? undefined,
          name: result.name,
          createdAt: formatTimestamp(result.createdAt)
        },
        message: `Fetched integration **${result.name || result.id}** (${result.type}).`
      };
    }

    if (action === 'update') {
      if (!integrationId) throw createApiServiceError('integrationId is required for update');
      let data: Record<string, any> = {};
      if (type) data.type = type;
      if (botId) data.botId = botId;
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (settings) Object.assign(data, settings);
      if (type !== undefined) data.type = type;
      if (meta) data.meta = meta;
      let result = await client.updateIntegration(integrationId, data);
      return {
        output: {
          integrationId: result.id || integrationId,
          type: result.type ?? type,
          botId: result.botId ?? botId,
          name: result.name ?? name,
          createdAt: formatTimestamp(result.createdAt)
        },
        message: `Integration **${integrationId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!integrationId) throw createApiServiceError('integrationId is required for delete');
      await client.deleteIntegration(integrationId, type);
      return {
        output: { integrationId },
        message: `Integration **${integrationId}** deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
