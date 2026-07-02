import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaggleClient } from '../lib/client';
import { spec } from '../spec';

let competitionSchema = z
  .object({
    ref: z.string().describe('Competition reference slug'),
    title: z.string().describe('Competition title'),
    url: z.string().describe('Competition URL'),
    description: z.string().optional().describe('Competition description'),
    organizationName: z.string().optional().describe('Organization hosting the competition'),
    organizationRef: z.string().optional().describe('Organization reference'),
    category: z.string().optional().describe('Competition category'),
    reward: z.string().optional().describe('Competition reward/prize'),
    deadline: z.string().optional().describe('Submission deadline'),
    kernelCount: z.number().optional().describe('Number of kernels submitted'),
    teamCount: z.number().optional().describe('Number of teams'),
    userHasEntered: z
      .boolean()
      .optional()
      .describe('Whether the authenticated user has entered'),
    enabledDate: z.string().optional().describe('Date the competition was enabled'),
    maxDailySubmissions: z.number().optional().describe('Maximum daily submissions allowed'),
    maxTeamSize: z.number().optional().describe('Maximum team size'),
    evaluationMetric: z.string().optional().describe('Evaluation metric used'),
    tags: z
      .array(
        z.object({
          ref: z.string().optional(),
          name: z.string().optional(),
          description: z.string().optional()
        })
      )
      .optional()
      .describe('Tags associated with the competition')
  })
  .passthrough();

export let searchCompetitions = SlateTool.create(spec, {
  name: 'Search Competitions',
  key: 'search_competitions',
  description: `Search and list Kaggle competitions with filtering options. Find competitions by keyword, category (featured, research, playground, etc.), and sort by various criteria like deadline, recently created, or number of teams.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter competitions'),
      category: z
        .enum([
          'all',
          'featured',
          'research',
          'recruitment',
          'gettingStarted',
          'masters',
          'playground'
        ])
        .optional()
        .describe('Competition category filter'),
      group: z
        .enum(['general', 'entered', 'inClass'])
        .optional()
        .describe('Competition group filter'),
      sortBy: z
        .enum([
          'grouped',
          'prize',
          'earliestDeadline',
          'latestDeadline',
          'numberOfTeams',
          'recentlyCreated'
        ])
        .optional()
        .describe('Sort order for results'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      competitions: z.array(competitionSchema).describe('List of matching competitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaggleClient(ctx.auth);
    let competitions = await client.listCompetitions({
      search: ctx.input.search,
      category: ctx.input.category,
      group: ctx.input.group,
      sortBy: ctx.input.sortBy,
      page: ctx.input.page
    });
    return {
      output: { competitions: competitions ?? [] },
      message: `Found ${(competitions ?? []).length} competition(s)${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
