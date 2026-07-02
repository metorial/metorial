import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

let datasetSchema = z.object({
  datasetId: z.string().describe('Full dataset ID (e.g. "username/dataset-name")'),
  author: z.string().optional().describe('Author/owner of the dataset'),
  sha: z.string().optional().describe('Latest commit SHA'),
  lastModified: z.string().optional().describe('Last modification timestamp'),
  private: z.boolean().optional().describe('Whether the dataset is private'),
  downloads: z.number().optional().describe('Total download count'),
  likes: z.number().optional().describe('Number of likes'),
  tags: z.array(z.string()).optional().describe('Tags on the dataset')
});

export let searchDatasetsTool = SlateTool.create(spec, {
  name: 'Search Datasets',
  key: 'search_datasets',
  description: `Search for datasets on Hugging Face Hub. Filter by keyword, author, and tags. Results include dataset metadata such as downloads and likes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter datasets by name or description'),
      author: z.string().optional().describe('Filter by author/organization'),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
      sort: z
        .enum(['downloads', 'likes', 'lastModified', 'trending', 'createdAt'])
        .optional()
        .describe('Sort field'),
      direction: z
        .enum(['-1', '1'])
        .optional()
        .describe('Sort direction: -1 for descending, 1 for ascending'),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of results (default 20)')
    })
  )
  .output(
    z.object({
      datasets: z.array(datasetSchema).describe('List of matching datasets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });

    let results = await client.searchDatasets({
      search: ctx.input.search,
      author: ctx.input.author,
      tags: ctx.input.tags,
      sort: ctx.input.sort,
      direction: ctx.input.direction,
      limit: ctx.input.limit
    });

    let datasets = results.map((d: any) => ({
      datasetId: d.id || d._id,
      author: d.author,
      sha: d.sha,
      lastModified: d.lastModified,
      private: d.private,
      downloads: d.downloads,
      likes: d.likes,
      tags: d.tags
    }));

    return {
      output: { datasets },
      message: `Found **${datasets.length}** dataset(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
