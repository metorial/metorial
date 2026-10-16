import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient, kaggleApiBase } from '../lib/client';
import {
  kaggleRecord,
  requireKagglePositiveNumber,
  requireKaggleText
} from '../lib/responses';
import { spec } from '../spec';

export let downloadDataset = SlateTool.create(spec, {
  name: 'Download Dataset',
  key: 'download_dataset',
  description:
    'Prepare a downloadable ZIP archive of a Kaggle dataset, or download one named file. Use get_dataset_details to discover file names and dataset versions.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ownerSlug: z.string().describe('Dataset owner from search_datasets.'),
      datasetSlug: z.string().describe('Dataset slug from search_datasets.'),
      fileName: z
        .string()
        .optional()
        .describe(
          'Exact file name from get_dataset_details. Omit to download the entire dataset.'
        ),
      versionNumber: z
        .number()
        .optional()
        .describe('Dataset version to download. Omit for the latest version.')
    })
  )
  .output(
    z.object({
      ref: z.string(),
      fileName: z.string(),
      versionNumber: z.number().optional(),
      metadata: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let owner = requireKaggleText(ctx.input.ownerSlug, 'Dataset owner');
    let slug = requireKaggleText(ctx.input.datasetSlug, 'Dataset slug');
    if (ctx.input.fileName !== undefined) requireKaggleText(ctx.input.fileName, 'File name');
    if (ctx.input.versionNumber !== undefined)
      requireKagglePositiveNumber(ctx.input.versionNumber, 'Dataset version');
    let client = new KaggleClient(ctx.auth);
    let metadata = kaggleRecord(
      await client.getDatasetMetadata(owner, slug),
      'dataset metadata'
    );
    let url = `${kaggleApiBase}/datasets/download/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`;
    if (ctx.input.fileName) url += `/${encodeURIComponent(ctx.input.fileName)}`;
    await ctx.addAttachment({
      type: 'url',
      url,
      headers: { Authorization: `Basic ${ctx.auth.token}` },
      ...(ctx.input.versionNumber === undefined
        ? {}
        : { query: { datasetVersionNumber: String(ctx.input.versionNumber) } }),
      ...(!ctx.input.fileName ? { mimeType: 'application/zip' } : {})
    });
    return {
      output: {
        ref: `${owner}/${slug}`,
        fileName: ctx.input.fileName ?? `${slug}.zip`,
        versionNumber: ctx.input.versionNumber,
        metadata
      },
      message: `Prepared dataset **${owner}/${slug}** for download.`
    };
  })
  .build();

export let downloadCompetitionData = SlateTool.create(spec, {
  name: 'Download Competition Data',
  key: 'download_competition_data',
  description:
    'Prepare downloadable competition data as a ZIP archive or one named file. Your account must have accepted the competition rules. Use get_competition_details to discover file names.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      competitionSlug: z.string().describe('Competition slug from search_competitions.'),
      fileName: z
        .string()
        .optional()
        .describe('Exact competition file name. Omit for the full ZIP archive.')
    })
  )
  .output(z.object({ competitionSlug: z.string(), fileName: z.string() }))
  .handleInvocation(async ctx => {
    let slug = requireKaggleText(ctx.input.competitionSlug, 'Competition slug');
    if (ctx.input.fileName !== undefined) requireKaggleText(ctx.input.fileName, 'File name');
    // Confirm the competition can be accessed before returning its download endpoint.
    await new KaggleClient(ctx.auth).listCompetitionFiles(slug);
    let path = ctx.input.fileName
      ? `/competitions/data/download/${encodeURIComponent(slug)}/${encodeURIComponent(ctx.input.fileName)}`
      : `/competitions/data/download-all/${encodeURIComponent(slug)}`;
    await ctx.addAttachment({
      type: 'url',
      url: `${kaggleApiBase}${path}`,
      headers: { Authorization: `Basic ${ctx.auth.token}` },
      ...(!ctx.input.fileName ? { mimeType: 'application/zip' } : {})
    });
    return {
      output: { competitionSlug: slug, fileName: ctx.input.fileName ?? `${slug}.zip` },
      message: `Prepared data for competition **${slug}** for download.`
    };
  })
  .build();

export let downloadModelVersion = SlateTool.create(spec, {
  name: 'Download Model Version',
  key: 'download_model_version',
  description:
    'Prepare a downloadable tar.gz archive of a specific Kaggle model variation version. Use get_model_details to discover models and variations.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ownerSlug: z.string().describe('Model owner.'),
      modelSlug: z.string().describe('Model slug.'),
      framework: z.string().describe('Variation framework, such as pytorch or tensorflow.'),
      variationSlug: z.string().describe('Variation slug from get_model_details.'),
      versionNumber: z.number().describe('Version number to download.')
    })
  )
  .output(
    z.object({
      ref: z.string(),
      fileName: z.string(),
      versionNumber: z.number(),
      metadata: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    let parts = [
      ctx.input.ownerSlug,
      ctx.input.modelSlug,
      ctx.input.framework,
      ctx.input.variationSlug
    ];
    for (let part of parts) requireKaggleText(part, 'Model reference component');
    let version = requireKagglePositiveNumber(ctx.input.versionNumber, 'Model version');
    let client = new KaggleClient(ctx.auth);
    let metadata = kaggleRecord(
      await client.getModelInstance(
        ctx.input.ownerSlug,
        ctx.input.modelSlug,
        ctx.input.framework,
        ctx.input.variationSlug
      ),
      'model variation'
    );
    await ctx.addAttachment({
      type: 'url',
      url: `${kaggleApiBase}/models/${parts.map(encodeURIComponent).join('/')}/${version}/download`,
      headers: { Authorization: `Basic ${ctx.auth.token}` },
      mimeType: 'application/gzip'
    });
    return {
      output: {
        ref: `${parts.join('/')}/${version}`,
        fileName: `${ctx.input.modelSlug}.tar.gz`,
        versionNumber: version,
        metadata
      },
      message: `Prepared model version **${parts.join('/')}/${version}** for download.`
    };
  })
  .build();
