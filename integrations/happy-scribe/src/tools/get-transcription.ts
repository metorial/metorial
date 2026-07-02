import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTranscription = SlateTool.create(spec, {
  name: 'Get Transcription',
  key: 'get_transcription',
  description: `Retrieve detailed metadata about a specific transcription including its state, language, duration, cost, and sharing status. To get the actual transcript content, use the export tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptionId: z.string().describe('ID of the transcription to retrieve.')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().describe('ID of the transcription.'),
      name: z.string().describe('Name of the transcription.'),
      state: z
        .string()
        .describe(
          'Current state (e.g. initial, automatic_transcribing, automatic_done, locked, failed).'
        ),
      language: z.string().describe('Language code of the transcription.'),
      audioLengthInSeconds: z
        .number()
        .optional()
        .nullable()
        .describe('Duration of the audio in seconds.'),
      costInCents: z
        .number()
        .optional()
        .nullable()
        .describe('Cost of the transcription in cents.'),
      sharingEnabled: z
        .boolean()
        .optional()
        .describe('Whether sharing is enabled for this transcription.'),
      tags: z
        .array(z.string())
        .optional()
        .nullable()
        .describe('Tags associated with the transcription.'),
      createdAt: z.string().optional().describe('Creation timestamp.'),
      updatedAt: z.string().optional().describe('Last update timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTranscription(ctx.input.transcriptionId);

    return {
      output: {
        transcriptionId: result.id,
        name: result.name,
        state: result.state,
        language: result.language,
        audioLengthInSeconds: result.audioLengthInSeconds,
        costInCents: result.costInCents,
        sharingEnabled: result.sharingEnabled,
        tags: result.tags,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Transcription **${result.name}** (${result.id}) is in state **${result.state}** with language **${result.language}**.`
    };
  })
  .build();
