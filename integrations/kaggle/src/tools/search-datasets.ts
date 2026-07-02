import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

let datasetSchema = z
  .object({
    ref: z.string().describe('Dataset reference in owner/slug format'),
    title: z.string().describe('Dataset title'),
    url: z.string().optional().describe('Dataset URL'),
    subtitle: z.string().optional().describe('Dataset subtitle'),
    creatorName: z.string().optional().describe('Creator display name'),
    creatorUrl: z.string().optional().describe('Creator profile URL'),
    totalBytes: z.number().optional().describe('Total size in bytes'),
    lastUpdated: z.string().optional().describe('Last updated date'),
    downloadCount: z.number().optional().describe('Number of downloads'),
    voteCount: z.number().optional().describe('Number of upvotes'),
    usabilityRating: z.number().optional().describe('Usability rating (0-1)'),
    licenseName: z.string().optional().describe('License name'),
    description: z.string().optional().describe('Dataset description'),
    ownerName: z.string().optional().describe('Dataset owner name'),
    ownerRef: z.string().optional().describe('Dataset owner reference'),
    kernelCount: z.number().optional().describe('Number of kernels using this dataset'),
    topicCount: z.number().optional().describe('Number of discussion topics'),
    viewCount: z.number().optional().describe('Number of views'),
    currentDatasetVersionNumber: z.number().optional().describe('Current version number'),
    tags: z
      .array(
        z.object({
          ref: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional()
        })
      )
      .optional()
      .describe('Tags associated with the dataset')
  })
  .passthrough();

export let searchDatasets = SlateTool.create(spec, {
  name: 'Search Datasets',
  key: 'search_datasets',
  description: `Search and list Kaggle datasets with comprehensive filtering. Find datasets by keyword, file type, license, size range, and tags. Sort results by hotness, votes, updated date, relevance, or size.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter datasets'),
      sortBy: z
        .enum(['hottest', 'votes', 'updated', 'active', 'published'])
        .optional()
        .describe('Sort order for results'),
      fileType: z
        .enum(['all', 'csv', 'sqlite', 'json', 'bigQuery'])
        .optional()
        .describe('Filter by file type'),
      license: z
        .enum(['all', 'cc', 'gpl', 'odb', 'other'])
        .optional()
        .describe('Filter by license type'),
      group: z
        .enum(['public', 'my', 'myPrivate', 'upvoted', 'user'])
        .optional()
        .describe('Dataset group filter'),
      user: z.string().optional().describe('Filter by dataset owner username'),
      minSize: z.number().optional().describe('Minimum dataset size in bytes'),
      maxSize: z.number().optional().describe('Maximum dataset size in bytes'),
      tagIds: z.string().optional().describe('Comma-separated tag IDs to filter by'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      datasets: z.array(datasetSchema).describe('List of matching datasets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let datasets = await client.listDatasets({
      search: ctx.input.search,
      sortBy: ctx.input.sortBy,
      fileType: ctx.input.fileType,
      license: ctx.input.license,
      group: ctx.input.group,
      user: ctx.input.user,
      minSize: ctx.input.minSize,
      maxSize: ctx.input.maxSize,
      tagIds: ctx.input.tagIds,
      page: ctx.input.page
    });
    return {
      output: { datasets: datasets ?? [] },
      message: `Found ${(datasets ?? []).length} dataset(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
