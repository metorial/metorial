import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let datasetInfoSchema = z
  .object({
    name: z.string().nullable().optional().describe('Dataset name'),
    description: z.string().nullable().optional().describe('Dataset description'),
    README: z.string().nullable().optional().describe('Dataset README')
  })
  .passthrough();

let datasetWithFilesSchema = z
  .object({
    name: z.string().nullable().optional().describe('Dataset name'),
    description: z.string().nullable().optional().describe('Dataset description'),
    README: z.string().nullable().optional().describe('Dataset README'),
    files: z.array(z.string()).nullable().optional().describe('Presigned download URLs')
  })
  .passthrough();

let releaseSchema = z
  .object({
    releaseId: z.string().nullable().optional().describe('Release identifier (date string)'),
    README: z.string().nullable().optional().describe('Release README'),
    datasets: z
      .array(datasetInfoSchema)
      .nullable()
      .optional()
      .describe('Available datasets in this release')
  })
  .passthrough();

export let getDatasets = SlateTool.create(spec, {
  name: 'Get Datasets',
  key: 'get_datasets',
  description: `Access Semantic Scholar dataset releases for large-scale offline research. List available releases, get release details, or retrieve download links for specific datasets.
Supports the full S2AG (Academic Graph) and S2ORC (Open Research Corpus) datasets.`,
  instructions: [
    'To list all releases, omit releaseId and datasetName.',
    'To get details about a specific release, provide releaseId (e.g. "2022-01-17" or "latest").',
    'To get download links for a specific dataset, provide both releaseId and datasetName (e.g. "papers", "authors", "citations").'
  ],
  constraints: [
    'Dataset download links are presigned S3 URLs with temporary validity.',
    'Some dataset endpoints may require an API key.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      releaseId: z
        .string()
        .optional()
        .describe(
          'Release identifier (date string like "2022-01-17" or "latest"). Omit to list all releases.'
        ),
      datasetName: z
        .string()
        .optional()
        .describe(
          'Dataset name within a release (e.g. "papers", "authors", "citations"). Requires releaseId.'
        )
    })
  )
  .output(
    z.object({
      releases: z
        .array(z.string())
        .optional()
        .describe('List of available release IDs (when listing releases)'),
      release: releaseSchema
        .optional()
        .describe('Release details (when querying a specific release)'),
      dataset: datasetWithFilesSchema
        .optional()
        .describe('Dataset with download links (when querying a specific dataset)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.releaseId && ctx.input.datasetName) {
      let dataset = await client.getDatasetDownloadLinks(
        ctx.input.releaseId,
        ctx.input.datasetName
      );

      return {
        output: { dataset },
        message: `Retrieved download links for dataset **${ctx.input.datasetName}** in release **${ctx.input.releaseId}**. Found **${dataset.files?.length ?? 0}** download files.`
      };
    }

    if (ctx.input.releaseId) {
      let release = await client.getRelease(ctx.input.releaseId);

      return {
        output: { release },
        message: `Retrieved details for release **${ctx.input.releaseId}**. Contains **${release.datasets?.length ?? 0}** datasets.`
      };
    }

    let releases = await client.listReleases();
    let releaseList = Array.isArray(releases) ? releases : [];

    return {
      output: { releases: releaseList },
      message: `Found **${releaseList.length}** available dataset releases.`
    };
  })
  .build();
