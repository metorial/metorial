import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let extractionEventsTrigger = SlateTrigger.create(spec, {
  name: 'Extraction Events',
  key: 'extraction_events',
  description:
    'Receive webhook notifications when extraction events occur, such as files being processed, data being edited, confirmed, or processing failures.'
})
  .input(
    z.object({
      event: z
        .string()
        .describe(
          'Event type (e.g., extraction.processed, extraction.edited, extraction.confirmed, extraction.failed)'
        ),
      extractionId: z.string().describe('Extraction identifier'),
      batchId: z.string().describe('Batch identifier'),
      fileId: z.string().describe('File identifier'),
      fileName: z.string().describe('Name of the file'),
      status: z.string().describe('Processing status'),
      extractedData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Extracted field values'),
      fileUrl: z.string().optional().describe('URL to access the file')
    })
  )
  .output(
    z.object({
      extractionId: z.string().describe('Extraction identifier'),
      batchId: z.string().describe('Batch identifier'),
      fileId: z.string().describe('File identifier'),
      fileName: z.string().describe('Name of the file'),
      status: z.string().describe('Processing status of the file'),
      extractedData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Extracted field values'),
      fileUrl: z.string().optional().describe('URL to access the file')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        event: string;
        result: Array<{
          extractionId: string;
          batchId: string;
          fileId: string;
          fileName: string;
          status: string;
          result?: Record<string, unknown>;
          url?: string;
        }>;
      };

      let event = body.event || 'extraction.unknown';
      let files = body.result || [];

      let inputs = files.map(f => ({
        event,
        extractionId: f.extractionId,
        batchId: f.batchId,
        fileId: f.fileId,
        fileName: f.fileName,
        status: f.status,
        extractedData: f.result,
        fileUrl: f.url
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.event,
        id: `${ctx.input.extractionId}-${ctx.input.batchId}-${ctx.input.fileId}-${ctx.input.event}`,
        output: {
          extractionId: ctx.input.extractionId,
          batchId: ctx.input.batchId,
          fileId: ctx.input.fileId,
          fileName: ctx.input.fileName,
          status: ctx.input.status,
          extractedData: ctx.input.extractedData,
          fileUrl: ctx.input.fileUrl
        }
      };
    }
  })
  .build();
