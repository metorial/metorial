import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationId, rawSchema, transcriptionOutput } from '../lib/responses';
import { spec } from '../spec';

export let listTranscriptions = SlateTool.create(spec, {
  name: 'List Transcriptions',
  key: 'list_transcriptions',
  description: `List transcriptions in your organization, sorted with the most recent first. Returns metadata about each transcription including state, language, duration, and cost. Can be filtered by folder and tags. Use the export tool to retrieve the actual transcript content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe(
          'Organization ID. Call list_organizations to discover IDs. Falls back to the saved setting.'
        ),
      folderId: z.string().optional().describe('Filter transcriptions by folder ID.'),
      tags: z.array(z.string()).optional().describe('Filter transcriptions by tags.'),
      page: z.number().optional().describe('Page number for pagination (starts at 0).'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page, up to 100. The provider default is 5.')
    })
  )
  .output(
    z.object({
      transcriptions: z
        .array(
          z.object({
            transcriptionId: z.string().describe('ID of the transcription.'),
            name: z.string().describe('Name of the transcription.'),
            state: z.string().describe('Current state of the transcription.'),
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
            tags: z
              .array(z.string())
              .optional()
              .nullable()
              .describe('Tags associated with the transcription.'),
            createdAt: z.string().optional().describe('Creation timestamp.'),
            raw: rawSchema
              .optional()
              .describe(
                'Transcription metadata, excluding temporary media and file download URLs.'
              )
          })
        )
        .describe('List of transcriptions.'),
      nextPageUrl: z
        .string()
        .optional()
        .nullable()
        .describe('URL of the next page of results, if available.')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = organizationId(ctx.input.organizationId, ctx.config.organizationId);

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTranscriptions({
      organizationId: orgId,
      folderId: ctx.input.folderId,
      tags: ctx.input.tags,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let transcriptions = result.results.map(transcriptionOutput);

    return {
      output: {
        transcriptions,
        nextPageUrl: result._links?.next?.url || null
      },
      message: `Found **${transcriptions.length}** transcription(s).`
    };
  })
  .build();
