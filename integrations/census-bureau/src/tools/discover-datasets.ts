import { SlateTool } from 'slates';
import { z } from 'zod';
import { CensusDataClient } from '../lib/client';
import { spec } from '../spec';

let datasetSchema = z.object({
  title: z.string().describe('Dataset title'),
  description: z.string().optional().describe('Dataset description'),
  datasetPath: z.string().describe('Dataset path to use in queries (e.g., "acs/acs5")'),
  vintage: z.string().optional().describe('Vintage year of the dataset'),
  modified: z.string().optional().describe('Last modified date'),
  distribution: z
    .array(
      z.object({
        accessURL: z.string().optional().describe('API access URL'),
        format: z.string().optional().describe('Distribution format')
      })
    )
    .optional()
    .describe('Available distribution endpoints')
});

export let discoverDatasets = SlateTool.create(spec, {
  name: 'Discover Datasets',
  key: 'discover_datasets',
  description: `Search and browse available Census Bureau datasets. Returns dataset metadata including titles, descriptions, paths, and vintage years.

Use this tool to find the correct dataset path and vintage year before querying data. You can filter by vintage year and/or keyword to narrow results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vintage: z
        .string()
        .optional()
        .describe('Filter datasets by vintage year (e.g., "2022")'),
      keyword: z
        .string()
        .optional()
        .describe(
          'Search keyword to filter datasets by title or description (e.g., "population", "income", "housing")'
        )
    })
  )
  .output(
    z.object({
      datasets: z.array(datasetSchema).describe('List of matching datasets'),
      totalFound: z.number().describe('Total number of datasets found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CensusDataClient(ctx.auth.token);

    let datasets = await client.listDatasets({
      vintage: ctx.input.vintage,
      keyword: ctx.input.keyword
    });

    let mapped = datasets.slice(0, 100).map((ds: any) => ({
      title: ds.title || 'Untitled',
      description: ds.description || undefined,
      datasetPath: (ds.c_dataset || []).join('/'),
      vintage: ds.c_vintage?.toString() || undefined,
      modified: ds.modified || undefined,
      distribution: (ds.distribution || []).map((d: any) => ({
        accessURL: d.accessURL || undefined,
        format: d['@type'] || undefined
      }))
    }));

    let filterDesc: any[] = [];
    if (ctx.input.vintage) filterDesc.push(`vintage ${ctx.input.vintage}`);
    if (ctx.input.keyword) filterDesc.push(`keyword "${ctx.input.keyword}"`);

    return {
      output: {
        datasets: mapped,
        totalFound: datasets.length
      },
      message: `Found **${datasets.length}** datasets${filterDesc.length ? ` matching ${filterDesc.join(' and ')}` : ''}. Showing up to 100 results.`
    };
  })
  .build();
