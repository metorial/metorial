import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

let datasetFileSchema = z
  .object({
    name: z.string().optional().describe('File name'),
    totalBytes: z.number().optional().describe('File size in bytes'),
    creationDate: z.string().optional().describe('File creation date'),
    description: z.string().optional().describe('File description'),
    columns: z
      .array(
        z.object({
          name: z.string().optional(),
          type: z.string().optional(),
          description: z.string().optional()
        })
      )
      .optional()
      .describe('Column definitions for tabular files')
  })
  .passthrough();

export let getDatasetDetails = SlateTool.create(spec, {
  name: 'Get Dataset Details',
  key: 'get_dataset_details',
  description: `Retrieve detailed information about a specific Kaggle dataset including metadata and file listing. Provide the dataset reference in "owner/dataset" format (e.g., "zillow/zecon").`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ownerSlug: z.string().describe('Dataset owner username'),
      datasetSlug: z.string().describe('Dataset slug/name'),
      versionNumber: z
        .number()
        .optional()
        .describe('Specific dataset version number to inspect')
    })
  )
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dataset metadata including title, description, licenses, and keywords'),
      files: z.array(datasetFileSchema).optional().describe('List of files in the dataset'),
      status: z.string().optional().describe('Dataset processing status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);

    let [metadata, filesData] = await Promise.all([
      client.getDatasetMetadata(ctx.input.ownerSlug, ctx.input.datasetSlug).catch(() => null),
      client
        .listDatasetFiles(ctx.input.ownerSlug, ctx.input.datasetSlug, {
          datasetVersionNumber: ctx.input.versionNumber
        })
        .catch(() => null)
    ]);

    let files = filesData?.dataFiles ?? filesData ?? [];

    return {
      output: {
        metadata: metadata ?? undefined,
        files,
        status: undefined
      },
      message: `Retrieved details for dataset **${ctx.input.ownerSlug}/${ctx.input.datasetSlug}** with ${files.length} file(s).`
    };
  })
  .build();
