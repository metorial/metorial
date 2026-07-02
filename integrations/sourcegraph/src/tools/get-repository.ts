import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRepository = SlateTool.create(spec, {
  name: 'Get Repository',
  key: 'get_repository',
  description: `Get detailed information about a specific repository including branches, tags, clone status, and external source metadata.
Provide the full repository name (e.g., \`github.com/owner/repo\`).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Full repository name (e.g., github.com/owner/repo)')
    })
  )
  .output(
    z.object({
      repositoryId: z.string().describe('Repository GraphQL ID'),
      name: z.string().describe('Full repository name'),
      url: z.string().describe('URL on the Sourcegraph instance'),
      description: z.string().optional().describe('Repository description'),
      createdAt: z.string().optional().describe('When the repository was added'),
      cloned: z.boolean().optional().describe('Whether the repository has been cloned'),
      cloneInProgress: z.boolean().optional().describe('Whether cloning is in progress'),
      lastCloneError: z.string().optional().describe('Last clone error message if any'),
      serviceType: z.string().optional().describe('Code host type (e.g., github, gitlab)'),
      defaultBranch: z.string().optional().describe('Default branch name'),
      branches: z
        .array(
          z.object({
            name: z.string(),
            commitOid: z.string().optional()
          })
        )
        .optional()
        .describe('Repository branches'),
      branchCount: z.number().optional().describe('Total number of branches'),
      tags: z
        .array(
          z.object({
            name: z.string(),
            commitOid: z.string().optional()
          })
        )
        .optional()
        .describe('Repository tags'),
      tagCount: z.number().optional().describe('Total number of tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      authorizationHeader: ctx.auth.authorizationHeader
    });

    let data = await client.getRepository(ctx.input.repositoryName);
    let repo = data.repository;

    if (!repo) {
      throw new Error(`Repository not found: ${ctx.input.repositoryName}`);
    }

    let branches = (repo.branches?.nodes || []).map((b: any) => ({
      name: b.name,
      commitOid: b.target?.oid
    }));

    let tags = (repo.tags?.nodes || []).map((t: any) => ({
      name: t.name,
      commitOid: t.target?.oid
    }));

    return {
      output: {
        repositoryId: repo.id,
        name: repo.name,
        url: repo.url,
        description: repo.description || undefined,
        createdAt: repo.createdAt || undefined,
        cloned: repo.mirrorInfo?.cloned,
        cloneInProgress: repo.mirrorInfo?.cloneInProgress,
        lastCloneError: repo.mirrorInfo?.lastError || undefined,
        serviceType: repo.externalRepository?.serviceType || undefined,
        defaultBranch: repo.defaultBranch?.name || undefined,
        branches,
        branchCount: repo.branches?.totalCount,
        tags,
        tagCount: repo.tags?.totalCount
      },
      message: `Repository **${repo.name}** — ${repo.mirrorInfo?.cloned ? 'cloned' : 'not cloned'}, default branch: ${repo.defaultBranch?.name || 'unknown'}, ${repo.branches?.totalCount || 0} branches, ${repo.tags?.totalCount || 0} tags.`
    };
  })
  .build();
