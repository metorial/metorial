import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { spec } from '../spec';

export let getMentionsTool = SlateTool.create(spec, {
  name: 'Get Mentions',
  key: 'get_mentions',
  description: `Retrieve posts where your Instagram account has been tagged or @mentioned. Returns media where you were tagged in photos, as well as active stories.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('Instagram user ID. Defaults to the authenticated user.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of mentions to return (default: 25)'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      mentions: z
        .array(
          z.object({
            mediaId: z.string().describe('Media ID of the mentioning post'),
            caption: z.string().optional().describe('Caption of the post'),
            mediaType: z.string().optional().describe('Media type'),
            mediaUrl: z.string().optional().describe('Media URL'),
            permalink: z.string().optional().describe('Link to the post'),
            timestamp: z.string().optional().describe('Published timestamp'),
            username: z.string().optional().describe('Username of the post author')
          })
        )
        .describe('Posts where you were mentioned or tagged'),
      nextCursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let effectiveUserId = ctx.input.userId || ctx.auth.userId || 'me';
    let result = await client.getMentionedMedia(effectiveUserId, {
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let mentions = (result.data || []).map((m: any) => ({
      mediaId: m.id,
      caption: m.caption,
      mediaType: m.media_type,
      mediaUrl: m.media_url,
      permalink: m.permalink,
      timestamp: m.timestamp,
      username: m.username
    }));

    return {
      output: {
        mentions,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${mentions.length}** posts where you were mentioned or tagged.`
    };
  })
  .build();
