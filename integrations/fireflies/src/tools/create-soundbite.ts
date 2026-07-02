import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createSoundbite = SlateTool.create(spec, {
  name: 'Create Soundbite',
  key: 'create_soundbite',
  description: `Create a soundbite (short clip) from a completed meeting recording. Specify start and end times in seconds to extract a key moment.`
})
  .input(
    z.object({
      transcriptId: z.string().describe('The transcript ID to create the soundbite from'),
      startTime: z.number().describe('Start time in seconds'),
      endTime: z.number().describe('End time in seconds'),
      name: z.string().optional().describe('Name for the soundbite (max 256 characters)'),
      mediaType: z.enum(['audio', 'video']).optional().describe('Media type of the soundbite'),
      privacies: z
        .array(z.enum(['public', 'team', 'participants']))
        .optional()
        .describe('Visibility settings for the soundbite'),
      summary: z
        .string()
        .optional()
        .describe('Summary text for the soundbite (max 500 characters)')
    })
  )
  .output(
    z.object({
      biteId: z.string().describe('Unique identifier for the created soundbite'),
      name: z.string().nullable().describe('Soundbite name'),
      status: z.string().nullable().describe('Processing status'),
      summary: z.string().nullable().describe('Soundbite summary')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.startTime < 0 || ctx.input.endTime <= ctx.input.startTime) {
      throw firefliesServiceError(
        'endTime must be greater than startTime, and startTime must be non-negative.'
      );
    }
    if (ctx.input.name && ctx.input.name.length > 256) {
      throw firefliesServiceError('name must be 256 characters or fewer.');
    }
    if (ctx.input.summary && ctx.input.summary.length > 500) {
      throw firefliesServiceError('summary must be 500 characters or fewer.');
    }

    let client = new FirefliesClient({ token: ctx.auth.token });

    let result = await client.createBite({
      transcriptId: ctx.input.transcriptId,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      name: ctx.input.name,
      mediaType: ctx.input.mediaType,
      privacies: ctx.input.privacies,
      summary: ctx.input.summary
    });

    return {
      output: {
        biteId: result?.id ?? '',
        name: result?.name ?? null,
        status: result?.status ?? null,
        summary: result?.summary ?? null
      },
      message: `Created soundbite **"${result?.name ?? 'Untitled'}"** (${ctx.input.startTime}s - ${ctx.input.endTime}s). Status: ${result?.status ?? 'pending'}.`
    };
  })
  .build();
