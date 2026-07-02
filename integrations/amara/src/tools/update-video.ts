import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateVideo = SlateTool.create(spec, {
  name: 'Update Video',
  key: 'update_video',
  description: `Update a video's metadata such as title, description, thumbnail, or move it to a different team/project. Only provided fields will be updated.`,
  instructions: [
    'To move a video between teams, provide the target team slug. To also change project, provide both team and project.',
    'The user must have permission to remove the video from the source team and add it to the target team.'
  ]
})
  .input(
    z.object({
      videoId: z.string().describe('The video identifier to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      primaryAudioLanguageCode: z
        .string()
        .optional()
        .describe('New primary audio language code (BCP-47)'),
      thumbnail: z.string().optional().describe('New thumbnail URL'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated metadata key-value pairs'),
      teamSlug: z.string().optional().describe('Move video to this team'),
      projectSlug: z.string().optional().describe('Move video to this project within the team')
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Updated video identifier'),
      title: z.string().describe('Updated title'),
      description: z.string().describe('Updated description'),
      team: z.string().nullable().describe('Current team slug'),
      project: z.string().nullable().describe('Current project slug')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let v = await client.updateVideo(ctx.input.videoId, {
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
        description: v.description,
        team: v.team,
        project: v.project
      },
      message: `Updated video **"${v.title}"** (\`${v.id}\`).`
    };
  })
  .build();
