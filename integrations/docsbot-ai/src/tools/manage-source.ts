import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { resolveTeamId, teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageSource = SlateTool.create(spec, {
  name: 'Manage Source',
  key: 'manage_source',
  description:
    'Retry a failed training source or update its dashboard title without reindexing. Call list_teams and list_sources to discover IDs. Title updates support URL lists, sitemaps, website sources, and multi-file documents; other source types return a provider conflict.',
  instructions: [
    'Use retry only for a source whose status is failed. For update_title, provide title; an empty string clears it.'
  ]
})
  .input(
    z.object({
      teamId: teamIdSchema,
      botId: z.string().describe('Bot ID from list_bots'),
      sourceId: z.string().describe('Source ID from list_sources'),
      action: z.enum(['retry', 'update_title']).describe('Source operation'),
      title: z
        .string()
        .optional()
        .describe('Required for update_title; omit for retry. Empty string clears the title.')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('Source identifier'),
      type: z.string().describe('Source type'),
      status: z.string().describe('Resulting source status'),
      title: z.string().optional().describe('Source dashboard title')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'update_title' && ctx.input.title === undefined) {
      throw createApiServiceError(
        'Provide title for update_title. Use an empty string to clear it.'
      );
    }
    if (ctx.input.action === 'retry' && ctx.input.title !== undefined) {
      throw createApiServiceError('Omit title when retrying a failed source.');
    }
    let teamId = resolveTeamId(ctx.input.teamId, ctx.config.teamId);
    let client = new DocsBotAdminClient(ctx.auth.token);
    let source =
      ctx.input.action === 'retry'
        ? await client.retrySource(teamId, ctx.input.botId, ctx.input.sourceId)
        : await client.updateSourceTitle(
            teamId,
            ctx.input.botId,
            ctx.input.sourceId,
            ctx.input.title!
          );
    return {
      output: {
        sourceId: source.id,
        type: source.type,
        status: source.status,
        title: source.title ?? undefined
      },
      message: `Completed ${ctx.input.action} for source \`${source.id}\` (${source.status})`
    };
  })
  .build();
