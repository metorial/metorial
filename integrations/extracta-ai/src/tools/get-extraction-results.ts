import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExtractionResultsTool = SlateTool.create(spec, {
  name: 'Get Extraction Results',
  key: 'get_extraction_results',
  description: `Retrieve extracted data results for a batch of processed files. Returns the extracted fields and values for each file. Optionally filter by a specific file ID.`,
  constraints: [
    'Maintain a delay of 2 seconds between consecutive requests to avoid rate limiting.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      extractionId: z.string().describe('Unique identifier of the extraction'),
      batchId: z.string().describe('Unique identifier of the batch to retrieve results for'),
      fileId: z.string().optional().describe('Optionally filter results to a specific file')
    })
  )
  .output(
    z.object({
      extractionId: z.string().describe('Extraction identifier'),
      batchId: z.string().describe('Batch identifier'),
      status: z
        .string()
        .optional()
        .describe('Processing status (e.g., "waiting" if still processing)'),
      files: z
        .array(
          z.object({
            fileName: z.string().describe('Name of the processed file'),
            fileId: z.string().optional().describe('Unique file identifier'),
            status: z.string().describe('Processing status of the file'),
            extractedData: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Extracted field values'),
            fileUrl: z.string().optional().describe('URL to access the file')
          })
        )
        .optional()
        .describe('Processed files with their extraction results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getBatchResults({
      extractionId: ctx.input.extractionId,
      batchId: ctx.input.batchId,
      fileId: ctx.input.fileId
    });

    let files = result.files?.map(
      (f: {
        fileName: string;
        fileId?: string;
        status: string;
        result?: Record<string, unknown>;
        url?: string;
      }) => ({
        fileName: f.fileName,
        fileId: f.fileId,
        status: f.status,
        extractedData: f.result,
        fileUrl: f.url
      })
    );

    let processedCount =
      files?.filter((f: { status: string }) => f.status === 'processed').length || 0;

    return {
      output: {
        extractionId: result.extractionId,
        batchId: result.batchId,
        status: result.status,
        files
      },
      message:
        result.status === 'waiting'
          ? `Batch \`${ctx.input.batchId}\` is still processing.`
          : `Retrieved results for batch \`${ctx.input.batchId}\`: ${processedCount} file(s) processed.`
    };
  })
  .build();
