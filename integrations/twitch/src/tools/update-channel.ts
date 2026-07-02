import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwitchClient } from '../lib/client';
import { spec } from '../spec';

export let updateChannel = SlateTool.create(spec, {
  name: 'Update Channel',
  key: 'update_channel',
  description: `Update a channel's broadcast configuration. Modify the stream title, game/category, language, tags, stream delay, and content classification labels.`,
  instructions: [
    'Requires the **channel:manage:broadcast** scope.',
    'To change the game/category, provide the **gameId** (use Search to find game IDs).',
    'Set **gameId** to an empty string to clear the current game.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      broadcasterId: z.string().describe('The broadcaster user ID whose channel to update'),
      title: z.string().optional().describe('New stream title'),
      gameId: z.string().optional().describe('Game/category ID (empty string to clear)'),
      language: z
        .string()
        .optional()
        .describe('Stream language as an ISO 639-1 code (e.g. "en")'),
      delay: z.number().optional().describe('Stream delay in seconds (Partner only)'),
      tags: z.array(z.string()).optional().describe('Tags for the stream (max 10)'),
      isBrandedContent: z
        .boolean()
        .optional()
        .describe('Whether the channel has branded content')
    })
  )
  .output(
    z.object({
      broadcasterId: z.string(),
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwitchClient(ctx.auth.token, ctx.auth.clientId);

    await client.updateChannelInfo(ctx.input.broadcasterId, {
      title: ctx.input.title,
      gameId: ctx.input.gameId,
      broadcasterLanguage: ctx.input.language,
      delay: ctx.input.delay,
      tags: ctx.input.tags,
      isBrandedContent: ctx.input.isBrandedContent
    });

    let changes: string[] = [];
    if (ctx.input.title) changes.push(`title to "${ctx.input.title}"`);
    if (ctx.input.gameId !== undefined) changes.push(`game ID to "${ctx.input.gameId}"`);
    if (ctx.input.language) changes.push(`language to "${ctx.input.language}"`);
    if (ctx.input.tags) changes.push(`tags`);

    return {
      output: { broadcasterId: ctx.input.broadcasterId, updated: true },
      message: `Updated channel: ${changes.join(', ') || 'settings applied'}`
    };
  })
  .build();
