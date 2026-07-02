import { SlateTool } from 'slates';
import { z } from 'zod';
import { StudioClient } from '../lib/client';
import { spec } from '../spec';

export let createPersonalizedVideos = SlateTool.create(spec, {
  name: 'Create Personalized Videos',
  key: 'create_personalized_videos',
  description: `Generate personalized videos in bulk for a project (Studio API). Each video is customized with per-recipient variable values (e.g., names, custom text). The variable keys depend on how the project was configured. Video generation is asynchronous -- use the returned inference IDs to check status or set up a webhook for notifications. Use **List Projects** to see available project tags/variables.`,
  constraints: [
    'Video generation is asynchronous -- URLs returned may not be functional immediately.',
    'Each video entry must include a "uniqueId" field for tracking.',
    'Variable keys are project-specific and must match the project configuration.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace ID containing the project'),
      projectId: z.string().describe('Project ID to generate videos for'),
      videos: z
        .array(z.record(z.string(), z.string()))
        .describe(
          'Array of video entries. Each entry is an object with variable key-value pairs and a "unique_id" field for tracking.'
        )
    })
  )
  .output(
    z.object({
      videos: z.array(
        z.object({
          videoUrl: z.string().describe('S3 URL for the video file (may not be ready yet)'),
          audioUrl: z.string().describe('S3 URL for the audio file'),
          inferenceId: z.string().describe('Inference ID to track this video generation'),
          projectId: z.string().describe('Project ID'),
          uniqueId: z.string().describe('Unique ID provided in the request'),
          smartUrl: z.string().describe('Landing page URL'),
          permalink: z.string().describe('Permanent non-expiring link'),
          thumbnailUrl: z.string().describe('Thumbnail URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new StudioClient(ctx.auth.token);
    let result = await client.createVideos({
      workspaceId: ctx.input.workspaceId,
      projectId: ctx.input.projectId,
      videos: ctx.input.videos
    });

    return {
      output: {
        videos: result.map(v => ({
          videoUrl: v.video_url,
          audioUrl: v.audio_url,
          inferenceId: v.inference_id,
          projectId: v.project_id,
          uniqueId: v.unique_id,
          smartUrl: v.smart_url,
          permalink: v.permalink,
          thumbnailUrl: v.thumbnail_url
        }))
      },
      message: `Submitted **${result.length}** personalized video(s) for generation. Use the inference IDs to track status.`
    };
  })
  .build();
