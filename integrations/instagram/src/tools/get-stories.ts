import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { InstagramClient } from '../lib/client';
import { spec } from '../spec';

export let getStoriesTool = SlateTool.create(spec, {
  name: 'Get Stories',
  key: 'get_stories',
  description: `Retrieve currently active (non-expired) stories from an Instagram account. Stories are only available for 24 hours after publishing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('Instagram user ID. Defaults to the authenticated user.')
    })
  )
  .output(
    z.object({
      stories: z
        .array(
          z.object({
            mediaId: z.string().describe('Story media ID'),
            mediaType: z.string().optional().describe('Media type: IMAGE or VIDEO'),
            mediaUrl: z.string().optional().describe('Story media URL'),
            timestamp: z.string().optional().describe('Published timestamp'),
            permalink: z.string().optional().describe('Link to the story')
          })
        )
        .describe('List of active stories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new InstagramClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let effectiveUserId = ctx.input.userId || ctx.auth.userId || 'me';
    let result = await client.getStories(effectiveUserId);

    let stories = (result.data || []).map((s: any) => ({
      mediaId: s.id,
      mediaType: s.media_type,
      mediaUrl: s.media_url,
      timestamp: s.timestamp,
      permalink: s.permalink
    }));

    return {
      output: { stories },
      message: `Retrieved **${stories.length}** active stories.`
    };
  })
  .build();
