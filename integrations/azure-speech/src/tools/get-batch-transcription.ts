import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { spec } from '../spec';

export let getBatchTranscription = SlateTool.create(spec, {
  name: 'Get Batch Transcription',
  key: 'get_batch_transcription',
  description: `Retrieves the status and details of a batch transcription job. When the transcription is complete, also fetches the result files including transcription output and report.
Use this to check progress of a previously submitted batch transcription and to retrieve the final results.`,
  instructions: [
    'Provide the transcriptionId returned by the Create Batch Transcription tool.',
    'When the status is "Succeeded", the result files are automatically included in the response.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptionId: z
        .string()
        .describe('The unique identifier of the batch transcription job')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string().describe('Unique identifier of the transcription job'),
      status: z
        .string()
        .describe('Current status: "NotStarted", "Running", "Succeeded", or "Failed"'),
      displayName: z.string().describe('Display name of the transcription'),
      locale: z.string().describe('Locale of the transcription'),
      createdAt: z.string().describe('ISO 8601 timestamp when the transcription was created'),
      lastUpdatedAt: z.string().describe('ISO 8601 timestamp of the last status update'),
      files: z
        .array(
          z.object({
            fileName: z.string().describe('Name of the result file'),
            kind: z
              .string()
              .describe('Type of file (e.g., "Transcription", "TranscriptionReport")'),
            contentUrl: z.string().describe('URL to download the file content')
          })
        )
        .optional()
        .describe('Result files available when status is "Succeeded"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getTranscription(ctx.input.transcriptionId);

    let files: { fileName: string; kind: string; contentUrl: string }[] | undefined;

    if (result.status === 'Succeeded') {
      ctx.info('Transcription succeeded, fetching result files...');
      let filesResult = await client.getTranscriptionFiles(ctx.input.transcriptionId);
      let fileValues = filesResult.values || filesResult;
      files = (fileValues as any[]).map((f: any) => ({
        fileName: f.name,
        kind: f.kind,
        contentUrl: f.links?.contentUrl || f.contentUrl || ''
      }));
    }

    return {
      output: {
        transcriptionId: ctx.input.transcriptionId,
        status: result.status,
        displayName: result.displayName,
        locale: result.locale,
        createdAt: result.createdDateTime,
        lastUpdatedAt: result.lastActionDateTime,
        files
      },
      message: `Transcription **"${result.displayName}"** status: **${result.status}**.${files ? ` ${files.length} result file(s) available.` : ''}`
    };
  })
  .build();
