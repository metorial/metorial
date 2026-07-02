import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

let kernelSchema = z
  .object({
    ref: z.string().describe('Kernel reference in user/slug format'),
    title: z.string().describe('Kernel title'),
    url: z.string().optional().describe('Kernel URL'),
    author: z.string().optional().describe('Kernel author'),
    lastRunTime: z.string().optional().describe('Last execution time'),
    totalVotes: z.number().optional().describe('Number of upvotes'),
    language: z.string().optional().describe('Programming language'),
    kernelType: z.string().optional().describe('Type of kernel (notebook or script)'),
    isPrivate: z.boolean().optional().describe('Whether the kernel is private'),
    currentRunningVersion: z.number().optional().describe('Current running version number'),
    totalComments: z.number().optional().describe('Number of comments'),
    totalViews: z.number().optional().describe('Number of views')
  })
  .passthrough();

export let searchKernels = SlateTool.create(spec, {
  name: 'Search Notebooks',
  key: 'search_kernels',
  description: `Search and list Kaggle notebooks (kernels) with comprehensive filtering. Find notebooks by keyword, dataset, competition, language, type, and author. Sort by hotness, date created, date run, relevance, votes, or views.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter kernels'),
      user: z.string().optional().describe('Filter by kernel owner username'),
      language: z
        .enum(['all', 'python', 'r', 'sqlite', 'julia'])
        .optional()
        .describe('Filter by programming language'),
      kernelType: z
        .enum(['all', 'notebook', 'script'])
        .optional()
        .describe('Filter by kernel type'),
      outputType: z
        .enum(['all', 'visualization', 'data'])
        .optional()
        .describe('Filter by output type'),
      sortBy: z
        .enum([
          'hotness',
          'commentCount',
          'dateCreated',
          'dateRun',
          'relevance',
          'scoreAscending',
          'scoreDescending',
          'viewCount',
          'voteCount'
        ])
        .optional()
        .describe('Sort order for results'),
      dataset: z
        .string()
        .optional()
        .describe('Filter by dataset reference (owner/dataset-slug)'),
      competition: z.string().optional().describe('Filter by competition slug'),
      group: z.enum(['everyone', 'profile']).optional().describe('Kernel group filter'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      kernels: z.array(kernelSchema).describe('List of matching kernels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let kernels = await client.listKernels({
      search: ctx.input.search,
      user: ctx.input.user,
      language: ctx.input.language,
      kernelType: ctx.input.kernelType,
      outputType: ctx.input.outputType,
      sortBy: ctx.input.sortBy,
      dataset: ctx.input.dataset,
      competition: ctx.input.competition,
      group: ctx.input.group,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    return {
      output: { kernels: kernels ?? [] },
      message: `Found ${(kernels ?? []).length} notebook(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
