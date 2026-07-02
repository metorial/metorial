import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

let inferenceSchema = z.object({
  avatarId: z.string().describe('Avatar ID'),
  avatarTitle: z.string().nullable().describe('Avatar display name'),
  inferenceId: z.string().describe('Unique inference identifier'),
  title: z.string().nullable().describe('Video title'),
  status: z
    .string()
    .describe('Generation status (draft, processing, failed, succeeded, deleted)'),
  videoUrl: z.string().nullable().describe('URL to the generated video'),
  inputText: z.string().nullable().describe('Script text used for generation'),
  thumbnail: z.string().nullable().describe('Thumbnail image URL'),
  createdAt: z.string().nullable().describe('ISO 8601 creation timestamp')
});

export let getAvatarInference = SlateTool.create(spec, {
  name: 'Get Avatar Inferences',
  key: 'get_avatar_inferences',
  description: `Retrieve avatar video inference details. Can fetch a specific inference by ID or list all inferences with optional filters for avatar ID, title, status, and date range. Use this to check on the progress of avatar video generation jobs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inferenceId: z
        .string()
        .optional()
        .describe('If provided, returns details for this specific inference'),
      avatarId: z.string().optional().describe('Filter by avatar ID'),
      avatarTitle: z.string().optional().describe('Filter by avatar title'),
      inferenceTitle: z.string().optional().describe('Filter by inference title'),
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
      inferences: z.array(inferenceSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);

    if (ctx.input.inferenceId) {
      let details = await client.getAvatarInferenceDetails(ctx.input.inferenceId);
      return {
        output: {
          total: 1,
          inferences: [
            {
              avatarId: details.avatar_id,
              avatarTitle: details.avatar_title,
              inferenceId: details.inference_id,
              title: details.title,
              status: details.status,
              videoUrl: details.video,
              inputText: details.input_text,
              thumbnail: details.thumbnail,
              createdAt: details.created_at
            }
          ]
        },
        message: `Inference **${details.inference_id}** status: **${details.status}**.`
      };
    }

    let result = await client.listAvatarInferences({
      avatarId: ctx.input.avatarId,
      avatarTitle: ctx.input.avatarTitle,
      inferenceTitle: ctx.input.inferenceTitle,
      status: ctx.input.status,
      skip: ctx.input.skip,
      limit: ctx.input.limit,
      startDatetime: ctx.input.startDatetime,
      endDatetime: ctx.input.endDatetime
    });

    return {
      output: {
        total: result.total,
        inferences: result.data.map(i => ({
          avatarId: i.avatar_id,
          avatarTitle: i.avatar_title,
          inferenceId: i.inference_id,
          title: i.title,
          status: i.status,
          videoUrl: i.video,
          inputText: i.input_text,
          thumbnail: i.thumbnail,
          createdAt: i.created_at
        }))
      },
      message: `Found **${result.total}** avatar inferences.`
    };
  })
  .build();
