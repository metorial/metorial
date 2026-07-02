import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVideo = SlateTool.create(spec, {
  name: 'Create Video',
  key: 'create_video',
  description: `Add a new video to the Amara platform by providing a URL from a supported provider (YouTube, Vimeo) or a direct file link. Optionally associate the video with a team and project.`,
  instructions: [
    'The videoUrl must be a valid URL from a supported video provider or a direct video file link.',
    'To associate with a team, provide the team slug. To also place in a project, provide both team and project slug.'
  ]
})
  .input(
    z.object({
      videoUrl: z.string().describe('URL of the video (YouTube, Vimeo, or direct file link)'),
      title: z.string().optional().describe('Title of the video'),
      description: z.string().optional().describe('Description of the video'),
      primaryAudioLanguageCode: z
        .string()
        .optional()
        .describe('Primary audio language code (BCP-47, e.g. "en", "fr")'),
      thumbnail: z.string().optional().describe('Thumbnail image URL'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs'),
      teamSlug: z.string().optional().describe('Team slug to associate the video with'),
      projectSlug: z.string().optional().describe('Project slug within the team')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Unique identifier for the created video'),
      title: z.string().describe('Video title'),
      videoType: z.string().describe('Video type'),
      allUrls: z.array(z.string()).describe('All URLs associated with the video'),
      team: z.string().nullable().describe('Team slug'),
      project: z.string().nullable().describe('Project slug')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let v = await client.createVideo({
      videoUrl: ctx.input.videoUrl,
      title: ctx.input.title,
      description: ctx.input.description,
      primaryAudioLanguageCode: ctx.input.primaryAudioLanguageCode,
      thumbnail: ctx.input.thumbnail,
      metadata: ctx.input.metadata,
      team: ctx.input.teamSlug,
      project: ctx.input.projectSlug
    });

    return {
      output: {
        videoId: v.id,
        title: v.title,
        videoType: v.video_type,
        allUrls: v.all_urls,
        team: v.team,
        project: v.project
      },
      message: `Created video **"${v.title}"** with ID \`${v.id}\`.`
    };
  })
  .build();
