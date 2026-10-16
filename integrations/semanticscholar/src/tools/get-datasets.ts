import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  getDatasetFileExpiry,
  parseDatasetFileUrl,
  selectDatasetFile
} from '../lib/dataset-files';
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
    releaseId: z
      .string()
      .nullable()
      .optional()
      .describe('Legacy release identifier field, when supplied by the provider'),
    release_id: z
      .string()
      .optional()
      .describe('Actual provider release identifier (date string)'),
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
Discover the datasets available in each release before selecting files.`,
  instructions: [
    'To list all releases, omit releaseId and datasetName.',
    'To get details about a specific release, provide releaseId (e.g. "2022-01-17" or "latest").',
    'To get download links for a specific dataset, provide both releaseId and datasetName (e.g. "papers", "authors", "citations").',
    'To prepare one dataset shard, first retrieve its file list, then provide one original file URL as downloadFileUrl. Files can be several gigabytes.'
  ],
  constraints: [
    'Dataset download links are presigned S3 URLs with temporary validity.',
    'Some dataset endpoints may require an API key.',
    'Only one selected shard is prepared per call; metadata reads do not prepare files.',
    'Preparing a URL does not verify later file availability or storage limits.'
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
        ),
      downloadFileUrl: z
        .string()
        .optional()
        .describe(
          'One original URL from dataset.files to prepare for download. Matches the immutable object path in the selected release; requires releaseId and datasetName. Large files remain subject to download and storage limits.'
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

    if (ctx.input.datasetName !== undefined && !ctx.input.releaseId) {
      throw createApiServiceError('datasetName requires releaseId.');
    }
    if (
      ctx.input.downloadFileUrl !== undefined &&
      (!ctx.input.releaseId || !ctx.input.datasetName)
    ) {
      throw createApiServiceError('downloadFileUrl requires releaseId and datasetName.');
    }

    if (ctx.input.releaseId && ctx.input.datasetName) {
      let releaseId = ctx.input.releaseId;
      if (ctx.input.downloadFileUrl !== undefined && releaseId === 'latest') {
        releaseId = (await client.getRelease(releaseId)).release_id;
      }
      if (ctx.input.downloadFileUrl !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(releaseId)) {
        throw createApiServiceError(
          'The provider did not resolve an immutable dated release. Select a dated release before preparing a file.'
        );
      }
      let dataset = await client.getDatasetDownloadLinks(releaseId, ctx.input.datasetName);

      if (ctx.input.downloadFileUrl !== undefined) {
        let selected = parseDatasetFileUrl(ctx.input.downloadFileUrl);
        let url = selectDatasetFile(dataset.files, selected.pathname);
        await ctx.addAttachment({
          type: 'url',
          url: url.toString(),
          refreshReference: {
            releaseId,
            datasetName: ctx.input.datasetName,
            pathname: url.pathname
          },
          refreshAt: getDatasetFileExpiry(url)
        });
      }

      return {
        output: { dataset },
        message: `Retrieved download links for dataset **${ctx.input.datasetName}** in release **${ctx.input.releaseId}**. Found **${dataset.files.length}** download files.${ctx.input.downloadFileUrl !== undefined ? ' One selected file was prepared for download; later availability remains unverified.' : ''}`
      };
    }

    if (ctx.input.releaseId) {
      let release = await client.getRelease(ctx.input.releaseId);

      return {
        output: { release },
        message: `Retrieved details for release **${ctx.input.releaseId}**. Contains **${release.datasets.length}** datasets.`
      };
    }

    let releases = await client.listReleases();
    let releaseList = releases;

    return {
      output: { releases: releaseList },
      message: `Found **${releaseList.length}** available dataset releases.`
    };
  })
  .build();
