import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVideos = SlateTool.create(spec, {
  name: 'List Videos',
  key: 'list_videos',
  description: `Search and list videos on the Amara platform. Filter by team, project, or video URL. Results are paginated and sorted by the specified order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamSlug: z.string().optional().describe('Filter videos by team slug'),
      projectSlug: z.string().optional().describe('Filter videos by project slug'),
      videoUrl: z.string().optional().describe('Filter by video URL'),
      orderBy: z
        .enum(['title', '-title', 'created', '-created'])
        .optional()
        .describe('Sort order for results'),
      limit: z.number().optional().describe('Number of results per page (default 20)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching videos'),
      videos: z.array(
        z.object({
          videoId: z.string().describe('Unique video identifier'),
          title: z.string().describe('Video title'),
          description: z.string().describe('Video description'),
          duration: z.number().nullable().describe('Video duration in seconds'),
          thumbnail: z.string().describe('Thumbnail URL'),
          created: z.string().describe('Creation date (ISO 8601)'),
          team: z.string().nullable().describe('Team slug'),
          project: z.string().nullable().describe('Project slug'),
          primaryAudioLanguageCode: z
            .string()
            .nullable()
            .describe('Primary audio language (BCP-47)'),
          videoType: z.string().describe('Video type (e.g. Y for YouTube, V for Vimeo)'),
          allUrls: z.array(z.string()).describe('All URLs associated with this video'),
          languageCount: z.number().describe('Number of subtitle languages')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.listVideos({
      team: ctx.input.teamSlug,
      project: ctx.input.projectSlug,
      videoUrl: ctx.input.videoUrl,
      orderBy: ctx.input.orderBy,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let videos = result.objects.map(v => ({
      videoId: v.id,
      title: v.title,
      description: v.description,
      duration: v.duration,
      thumbnail: v.thumbnail,
      created: v.created,
      team: v.team,
      project: v.project,
      primaryAudioLanguageCode: v.primary_audio_language_code,
      videoType: v.video_type,
      allUrls: v.all_urls,
      languageCount: v.languages?.length ?? 0
    }));

    return {
      output: {
        totalCount: result.meta.total_count,
        videos
      },
      message: `Found **${result.meta.total_count}** videos. Returned ${videos.length} results.`
    };
  })
  .build();
