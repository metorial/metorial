import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVideoAnalytics = SlateTool.create(spec, {
  name: 'Get Video Analytics',
  key: 'get_video_analytics',
  description: `Retrieve analytics data for a specific video, including engagement metrics (loads, plays, play rate, completion rate, shares) and optionally individual view session data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The video ID to retrieve analytics for.'),
      includeViews: z
        .boolean()
        .optional()
        .describe('Whether to also fetch individual view session data.'),
      customViewerId: z
        .string()
        .optional()
        .describe('Filter views by a specific viewer ID (email or custom identifier).'),
      onlyWatched: z
        .boolean()
        .optional()
        .describe('Only return views where the video was actually watched.'),
      allViews: z.boolean().optional().describe('Return all views regardless of watch status.')
    })
  )
  .output(
    z.object({
      metrics: z
        .record(z.string(), z.any())
        .describe(
          'Engagement metrics including loads, plays, playRate, completionRate, and shares.'
        ),
      views: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Individual view session data, if requested.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let metrics = await client.getVideoMetrics(ctx.input.videoId);

    let views: any[] | undefined;
    if (ctx.input.includeViews) {
      let viewsResponse = await client.getVideoViews({
        videoId: ctx.input.videoId,
        customViewerId: ctx.input.customViewerId,
        onlyWatched: ctx.input.onlyWatched,
        allViews: ctx.input.allViews
      });
      views = Array.isArray(viewsResponse) ? viewsResponse : [viewsResponse];
    }

    return {
      output: {
        metrics,
        ...(views ? { views } : {})
      },
      message: `Retrieved analytics for video **${ctx.input.videoId}**.${views ? ` Includes **${views.length}** view session(s).` : ''}`
    };
  })
  .build();
