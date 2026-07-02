import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBranches = SlateTool.create(spec, {
  name: 'List Branches',
  key: 'list_branches',
  description: `Lists branches (Git refs) in a repository. Optionally filter to a specific prefix. Can also include branch statistics like ahead/behind counts relative to a base branch.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      filter: z
        .string()
        .optional()
        .describe(
          'Filter refs by prefix (e.g., "heads/main" for branches starting with "main", "heads/" for all branches, "tags/" for all tags)'
        ),
      includeStats: z
        .boolean()
        .optional()
        .describe('Include ahead/behind statistics for each branch'),
      baseVersion: z
        .string()
        .optional()
        .describe('Base branch for statistics comparison (e.g., "main")')
    })
  )
  .output(
    z.object({
      branches: z.array(
        z.object({
          name: z.string().describe('Full ref name (e.g., "refs/heads/main")'),
          shortName: z.string().describe('Short branch name (e.g., "main")'),
          objectId: z.string().describe('Commit SHA the ref points to'),
          creatorName: z.string().optional().describe('Display name of the ref creator'),
          aheadCount: z.number().optional().describe('Commits ahead of the base branch'),
          behindCount: z.number().optional().describe('Commits behind the base branch')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let refs = await client.listRefs(ctx.input.repositoryId, ctx.input.filter ?? 'heads/');

    let statsMap = new Map<string, { aheadCount: number; behindCount: number }>();
    if (ctx.input.includeStats) {
      let stats = await client.getBranchStats(
        ctx.input.repositoryId,
        undefined,
        ctx.input.baseVersion
      );
      for (let stat of stats) {
        statsMap.set(stat.name, {
          aheadCount: stat.aheadCount,
          behindCount: stat.behindCount
        });
      }
    }

    let branches = refs.map(ref => {
      let shortName = ref.name.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
      let stat = statsMap.get(shortName);
      return {
        name: ref.name,
        shortName,
        objectId: ref.objectId,
        creatorName: ref.creator?.displayName,
        aheadCount: stat?.aheadCount,
        behindCount: stat?.behindCount
      };
    });

    return {
      output: { branches },
      message: `Found **${branches.length}** branches in repository.`
    };
  })
  .build();
