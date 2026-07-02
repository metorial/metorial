import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { youtubeServiceError } from '../lib/errors';
import { youtubeActionScopes } from '../scopes';
import { spec } from '../spec';

export let listCaptions = SlateTool.create(spec, {
  name: 'List Captions',
  key: 'list_captions',
  description: `List all caption tracks for a YouTube video. Returns caption metadata including language, track kind, status, and whether it's auto-generated. Can also delete a caption track by ID.`,
  instructions: [
    'For listing: set action to "list" with videoId.',
    'For deleting: set action to "delete" with captionId. Requires the youtube.force-ssl scope.'
  ]
})
  .scopes(youtubeActionScopes.listCaptions)
  .input(
    z.object({
      action: z.enum(['list', 'delete']).describe('Action to perform'),
      videoId: z
        .string()
        .optional()
        .describe('Video ID to list captions for (required for list)'),
      captionId: z
        .string()
        .optional()
        .describe('Caption track ID to delete (required for delete)')
    })
  )
  .output(
    z.object({
      captions: z
        .array(
          z.object({
            captionId: z.string(),
            videoId: z.string().optional(),
            language: z.string().optional(),
            name: z.string().optional(),
            trackKind: z.string().optional(),
            audioTrackType: z.string().optional(),
            isCC: z.boolean().optional(),
            isDraft: z.boolean().optional(),
            isAutoSynced: z.boolean().optional(),
            status: z.string().optional(),
            lastUpdated: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromAuth(ctx.auth);

    if (ctx.input.action === 'list') {
      if (!ctx.input.videoId)
        throw youtubeServiceError('videoId is required for listing captions');

      let response = await client.listCaptions({
        part: ['snippet'],
        videoId: ctx.input.videoId
      });

      let captions = response.items.map(cap => ({
        captionId: cap.id,
        videoId: cap.snippet?.videoId,
        language: cap.snippet?.language,
        name: cap.snippet?.name,
        trackKind: cap.snippet?.trackKind,
        audioTrackType: cap.snippet?.audioTrackType,
        isCC: cap.snippet?.isCC,
        isDraft: cap.snippet?.isDraft,
        isAutoSynced: cap.snippet?.isAutoSynced,
        status: cap.snippet?.status,
        lastUpdated: cap.snippet?.lastUpdated
      }));

      return {
        output: { captions },
        message: `Found **${captions.length}** caption track(s) for video \`${ctx.input.videoId}\`.`
      };
    } else {
      if (!ctx.input.captionId)
        throw youtubeServiceError('captionId is required for deleting');

      await client.deleteCaption(ctx.input.captionId);

      return {
        output: { deleted: true },
        message: `Deleted caption track \`${ctx.input.captionId}\`.`
      };
    }
  })
  .build();
