import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getVideo = SlateTool.create(spec, {
  name: 'Get Video',
  key: 'get_video',
  description: `Retrieve detailed information about a specific video, including its metadata, URLs, and available subtitle languages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      videoId: z.string().describe('The unique video identifier')
    })
  )
  .output(
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
        .describe('Primary audio language code (BCP-47)'),
      videoType: z.string().describe('Video type'),
      allUrls: z.array(z.string()).describe('All URLs associated with this video'),
      metadata: z.record(z.string(), z.string()).describe('Custom metadata'),
      languages: z
        .array(
          z.object({
            code: z.string().describe('Language code (BCP-47)'),
            name: z.string().describe('Language name'),
            published: z.boolean().describe('Whether subtitles are published')
          })
        )
        .describe('Available subtitle languages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let v = await client.getVideo(ctx.input.videoId);

    return {
      output: {
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
        metadata: v.metadata,
        languages: (v.languages || []).map(l => ({
          code: l.code,
          name: l.name,
          published: l.published
        }))
      },
      message: `Retrieved video **"${v.title}"** (${v.id}) with ${v.languages?.length ?? 0} subtitle language(s).`
    };
  })
  .build();
