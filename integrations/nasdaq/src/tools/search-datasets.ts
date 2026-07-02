import { SlateTool } from 'slates';
import { z } from 'zod';
import { TablesClient } from '../lib/client';
import { spec } from '../spec';

export let searchDatasets = SlateTool.create(spec, {
  name: 'Search Datasets',
  key: 'search_datasets',
  description: `Search for datasets available on Nasdaq Data Link. Returns matching datasets with metadata including name, description, column definitions, date ranges, and whether a subscription is required.
Use this to discover what data is available before querying it.`,
  instructions: [
    'Use a descriptive search query (e.g., "Apple stock price", "GDP", "crude oil futures").',
    'Optionally restrict the search to a specific database using databaseCode.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('Search query text (e.g., "Apple stock price", "GDP", "crude oil").'),
      databaseCode: z
        .string()
        .optional()
        .describe('Restrict search to a specific database code (e.g., WIKI, FRED).'),
      perPage: z.number().optional().describe('Number of results per page (default 100).'),
      page: z.number().optional().describe('Page number for pagination (default 1).')
    })
  )
  .output(
    z.object({
      datasets: z
        .array(
          z.object({
            datasetId: z.number().describe('Unique dataset ID.'),
            datasetCode: z.string().describe('Dataset code.'),
            databaseCode: z.string().describe('Database code.'),
            name: z.string().describe('Dataset name.'),
            description: z.string().describe('Dataset description.'),
            refreshedAt: z.string().describe('Last refresh timestamp.'),
            newestDate: z.string().describe('Newest available date.'),
            oldestDate: z.string().describe('Oldest available date.'),
            columnNames: z.array(z.string()).describe('Available column names.'),
            frequency: z.string().describe('Data frequency.'),
            type: z.string().describe('Dataset type.'),
            premium: z.boolean().describe('Whether a subscription is required.')
          })
        )
        .describe('Matching datasets.'),
      totalCount: z.number().describe('Total number of matching datasets.'),
      currentPage: z.number().describe('Current page number.'),
      totalPages: z.number().describe('Total number of pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TablesClient({ apiKey: ctx.auth.token });

    let response = await client.searchDatasets({
      query: ctx.input.query,
      databaseCode: ctx.input.databaseCode,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let datasets = response.datasets.map(ds => ({
      datasetId: ds.id,
      datasetCode: ds.dataset_code,
      databaseCode: ds.database_code,
      name: ds.name,
      description: ds.description || '',
      refreshedAt: ds.refreshed_at || '',
      newestDate: ds.newest_available_date || '',
      oldestDate: ds.oldest_available_date || '',
      columnNames: ds.column_names || [],
      frequency: ds.frequency || '',
      type: ds.type || '',
      premium: ds.premium
    }));

    return {
      output: {
        datasets,
        totalCount: response.meta.total_count,
        currentPage: response.meta.current_page,
        totalPages: response.meta.total_pages
      },
      message: `Found **${response.meta.total_count}** datasets matching "${ctx.input.query}". Showing page ${response.meta.current_page} of ${response.meta.total_pages}.`
    };
  })
  .build();
