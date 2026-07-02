import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { spec } from '../spec';

export let listBatchTranscriptions = SlateTool.create(spec, {
  name: 'List Batch Transcriptions',
  key: 'list_batch_transcriptions',
  description: `Lists all batch transcription jobs in your Azure Speech resource. Returns summary information for each transcription including status, locale, and timestamps. Supports pagination for large result sets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      top: z.number().optional().describe('Maximum number of records to return (default 100)')
    })
  )
  .output(
    z.object({
      transcriptions: z
        .array(
          z.object({
            transcriptionId: z.string().describe('Unique identifier of the transcription'),
            displayName: z.string().describe('Display name of the transcription'),
            status: z.string().describe('Current status of the transcription'),
            locale: z.string().describe('Locale of the transcription'),
            createdAt: z.string().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of batch transcription jobs'),
      totalCount: z.number().describe('Number of transcriptions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listTranscriptions({
      skip: ctx.input.skip,
      top: ctx.input.top
    });

    let values = result.values || result;
    let transcriptions = (values as any[]).map((t: any) => {
      let selfUri = t.self as string;
      let transcriptionId = selfUri.split('/transcriptions/')[1]?.split('?')[0] || selfUri;
      return {
        transcriptionId,
        displayName: t.displayName,
        status: t.status,
        locale: t.locale,
        createdAt: t.createdDateTime
      };
    });

    return {
      output: {
        transcriptions,
        totalCount: transcriptions.length
      },
      message: `Found **${transcriptions.length}** batch transcription(s).`
    };
  })
  .build();
