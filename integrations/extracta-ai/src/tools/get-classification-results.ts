import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getClassificationResultsTool = SlateTool.create(spec, {
  name: 'Get Classification Results',
  key: 'get_classification_results',
  description: `Retrieve classification results for a batch of documents. Returns the predicted document type and confidence score for each file. Optionally filter by a specific file ID.`,
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
      classificationId: z.string().describe('Unique identifier of the classification'),
      batchId: z.string().describe('Unique identifier of the batch'),
      fileId: z.string().optional().describe('Optionally filter results to a specific file')
    })
  )
  .output(
    z.object({
      classificationId: z.string().describe('Classification identifier'),
      batchId: z.string().describe('Batch identifier'),
      status: z.string().optional().describe('Overall processing status'),
      files: z
        .array(
          z.object({
            fileId: z.string().describe('Unique file identifier'),
            fileName: z.string().describe('Name of the classified file'),
            status: z.string().describe('Processing status of the file'),
            confidence: z
              .number()
              .optional()
              .describe('Classification confidence score (0-1)'),
            documentType: z.string().optional().describe('Predicted document type'),
            fileUrl: z.string().optional().describe('URL to access the file'),
            linkedExtractionId: z
              .string()
              .optional()
              .describe('Linked extraction ID if auto-extraction was triggered'),
            linkedBatchId: z
              .string()
              .optional()
              .describe('Linked batch ID from auto-extraction'),
            linkedFileId: z.string().optional().describe('Linked file ID from auto-extraction')
          })
        )
        .optional()
        .describe('Classified files with results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getClassificationResults({
      classificationId: ctx.input.classificationId,
      batchId: ctx.input.batchId,
      fileId: ctx.input.fileId
    });

    let files = result.files?.map(
      (f: {
        fileId: string;
        fileName: string;
        status: string;
        result?: { confidence: number; documentType: string };
        url?: string;
        extraction?: { extractionId: string; batchId: string; fileId: string };
      }) => ({
        fileId: f.fileId,
        fileName: f.fileName,
        status: f.status,
        confidence: f.result?.confidence,
        documentType: f.result?.documentType,
        fileUrl: f.url,
        linkedExtractionId: f.extraction?.extractionId,
        linkedBatchId: f.extraction?.batchId,
        linkedFileId: f.extraction?.fileId
      })
    );

    let processedCount =
      files?.filter((f: { status: string }) => f.status === 'processed').length || 0;

    return {
      output: {
        classificationId: result.classificationId,
        batchId: result.batchId,
        status: result.status,
        files
      },
      message:
        result.status === 'waiting'
          ? `Batch \`${ctx.input.batchId}\` is still processing.`
          : `Retrieved classification results: ${processedCount} file(s) classified.`
    };
  })
  .build();
