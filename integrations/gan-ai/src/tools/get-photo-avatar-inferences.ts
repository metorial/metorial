import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

let photoInferenceSchema = z.object({
  photoAvatarId: z.string().describe('Photo avatar ID'),
  photoAvatarInferenceId: z.string().describe('Unique inference identifier'),
  title: z.string().nullable().describe('Video title'),
  status: z
    .string()
    .describe('Generation status (draft, processing, failed, succeeded, deleted)'),
  videoUrl: z.string().nullable().describe('URL to the generated video'),
  downloadableVideoLink: z.string().nullable().describe('Downloadable video link'),
  inputText: z.string().nullable().describe('Script text used'),
  createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
});

export let getPhotoAvatarInferences = SlateTool.create(spec, {
  name: 'Get Photo Avatar Inferences',
  key: 'get_photo_avatar_inferences',
  description: `Retrieve photo avatar video inference details. Can fetch a specific inference by ID or list inferences with optional filters for photo avatar ID, title, status, and date range. Use this to check on the progress of photo avatar video generation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      photoAvatarInferenceId: z
        .string()
        .optional()
        .describe('If provided, returns details for this specific inference'),
      photoAvatarId: z.string().optional().describe('Filter by photo avatar ID'),
      title: z.string().optional().describe('Filter by title'),
      status: z
        .array(z.enum(['draft', 'processing', 'failed', 'succeeded', 'deleted']))
        .optional()
        .describe('Filter by status'),
      skip: z.number().optional().describe('Number of records to skip'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of records to return (default 10)'),
      startDatetime: z
        .string()
        .optional()
        .describe('Filter by creation date after this ISO 8601 datetime'),
      endDatetime: z
        .string()
        .optional()
        .describe('Filter by creation date before this ISO 8601 datetime')
    })
  )
  .output(
    z.object({
      total: z.number().optional().describe('Total number of matching inferences'),
      inferences: z.array(photoInferenceSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);

    if (ctx.input.photoAvatarInferenceId) {
      let details = await client.getPhotoAvatarInferenceDetails({
        photoAvatarInferenceId: ctx.input.photoAvatarInferenceId,
        downloadableLink: true
      });
      return {
        output: {
          total: 1,
          inferences: [
            {
              photoAvatarId: details.photo_avatar_id,
              photoAvatarInferenceId: details.photo_avatar_inference_id,
              title: details.title,
              status: details.status,
              videoUrl: details.video,
              downloadableVideoLink: details.downloadable_video_link,
              inputText: details.input_text,
              createdAt: details.created_at
            }
          ]
        },
        message: `Photo avatar inference **${details.photo_avatar_inference_id}** status: **${details.status}**.`
      };
    }

    let result = await client.listPhotoAvatarInferences({
      photoAvatarId: ctx.input.photoAvatarId,
      title: ctx.input.title,
      status: ctx.input.status,
      skip: ctx.input.skip,
      limit: ctx.input.limit,
      startDatetime: ctx.input.startDatetime,
      endDatetime: ctx.input.endDatetime
    });

    return {
      output: {
        total: result.total,
        inferences: result.inference_list.map(i => ({
          photoAvatarId: i.photo_avatar_id,
          photoAvatarInferenceId: i.photo_avatar_inference_id,
          title: i.title,
          status: i.status,
          videoUrl: i.video,
          downloadableVideoLink: i.downloadable_video_link,
          inputText: i.input_text,
          createdAt: i.created_at
        }))
      },
      message: `Found **${result.total}** photo avatar inferences.`
    };
  })
  .build();
