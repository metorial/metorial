import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { kaggleList, kaggleRecord, kaggleSummary } from '../lib/responses';
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
      pageToken: z.string().optional().describe('Token for the next page of dataset files.'),
      pageSize: z.number().optional().describe('Maximum number of dataset files to return.'),
      includeStatus: z
        .boolean()
        .optional()
        .describe('Whether to retrieve dataset processing status.'),
      versionNumber: z
        .number()
        .optional()
        .describe('Specific dataset version number to inspect')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page of dataset files.'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original provider file-list and status responses.'),
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

    let [metadataData, filesData, statusData] = await Promise.all([
      client.getDatasetMetadata(ctx.input.ownerSlug, ctx.input.datasetSlug),
      client.listDatasetFiles(ctx.input.ownerSlug, ctx.input.datasetSlug, {
        datasetVersionNumber: ctx.input.versionNumber,
        pageToken: ctx.input.pageToken,
        pageSize: ctx.input.pageSize
      }),
      ctx.input.includeStatus
        ? client.getDatasetStatus(ctx.input.ownerSlug, ctx.input.datasetSlug)
        : undefined
    ]);
    let metadata = kaggleRecord(metadataData, 'dataset metadata');
    let files = kaggleList(
      filesData,
      ['datasetFiles', 'dataFiles', 'files'],
      'dataset files'
    ).map(item => kaggleSummary(item, 'dataset file'));
    let nextPageToken = Array.isArray(filesData)
      ? undefined
      : kaggleRecord(filesData, 'dataset files').nextPageToken;
    let status =
      statusData === undefined ? undefined : kaggleRecord(statusData, 'dataset status').status;

    return {
      output: {
        metadata,
        files,
        nextPageToken: typeof nextPageToken === 'string' ? nextPageToken : undefined,
        status: typeof status === 'string' ? status : undefined,
        raw: { files: filesData, ...(statusData !== undefined ? { status: statusData } : {}) }
      },
      message: `Retrieved details for dataset **${ctx.input.ownerSlug}/${ctx.input.datasetSlug}** with ${files.length} file(s).`
    };
  })
  .build();
