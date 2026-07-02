import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let fetchServerEmoji = SlateTool.create(spec, {
  name: 'Fetch Server Emoji',
  key: 'fetch_server_emoji',
  description: `List all custom emoji for a Revolt server. Returns emoji IDs, names, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serverId: z.string().describe('ID of the server to fetch emoji from')
    })
  )
  .output(
    z.object({
      emojis: z
        .array(
          z.object({
            emojiId: z.string().describe('ID of the emoji'),
            name: z.string().describe('Name of the emoji'),
            creatorId: z.string().describe('ID of the user who created the emoji'),
            animated: z.boolean().describe('Whether the emoji is animated'),
            nsfw: z.boolean().describe('Whether the emoji is NSFW')
          })
        )
        .describe('List of custom emoji')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.fetchServerEmoji(ctx.input.serverId);
    let emojisArray = Array.isArray(result) ? result : [];

    let emojis = emojisArray.map((e: any) => ({
      emojiId: e._id,
      name: e.name,
      creatorId: e.creator_id,
      animated: e.animated ?? false,
      nsfw: e.nsfw ?? false
    }));

    return {
      output: { emojis },
      message: `Found ${emojis.length} custom emoji in server \`${ctx.input.serverId}\``
    };
  })
  .build();

export let deleteEmoji = SlateTool.create(spec, {
  name: 'Delete Emoji',
  key: 'delete_emoji',
  description: `Delete a custom emoji from a Revolt server.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      emojiId: z.string().describe('ID of the emoji to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteEmoji(ctx.input.emojiId);

    return {
      output: { success: true },
      message: `Deleted emoji \`${ctx.input.emojiId}\``
    };
  })
  .build();
