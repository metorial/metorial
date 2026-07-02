import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let getRepository = SlateTool.create(spec, {
  name: 'Get Repository',
  key: 'get_repository',
  description: `Retrieve detailed information about a Travis CI repository, including its build status, settings, and owner. Can also activate, deactivate, star, or unstar a repository.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      repoSlugOrId: z.string().describe('Repository slug (e.g. "owner/repo") or numeric ID.'),
      action: z
        .enum(['get', 'activate', 'deactivate', 'star', 'unstar'])
        .default('get')
        .describe('Action to perform on the repository.')
    })
  )
  .output(
    z.object({
      repositoryId: z.number().describe('Unique repository ID'),
      name: z.string().describe('Repository name'),
      slug: z.string().describe('Repository slug (owner/name)'),
      description: z.string().nullable().describe('Repository description'),
      active: z.boolean().describe('Whether the repository is active on Travis CI'),
      isPrivate: z.boolean().describe('Whether the repository is private'),
      starred: z.boolean().optional().describe('Whether the repository is starred'),
      defaultBranch: z.string().optional().describe('Default branch name'),
      githubLanguage: z
        .string()
        .nullable()
        .optional()
        .describe('Primary programming language'),
      ownerLogin: z.string().optional().describe('Owner login name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let repo: any;
    let actionLabel = 'Retrieved';

    switch (ctx.input.action) {
      case 'activate':
        repo = await client.activateRepository(ctx.input.repoSlugOrId);
        actionLabel = 'Activated';
        break;
      case 'deactivate':
        repo = await client.deactivateRepository(ctx.input.repoSlugOrId);
        actionLabel = 'Deactivated';
        break;
      case 'star':
        repo = await client.starRepository(ctx.input.repoSlugOrId);
        actionLabel = 'Starred';
        break;
      case 'unstar':
        repo = await client.unstarRepository(ctx.input.repoSlugOrId);
        actionLabel = 'Unstarred';
        break;
      default:
        repo = await client.getRepository(ctx.input.repoSlugOrId);
        break;
    }

    return {
      output: {
        repositoryId: repo.id,
        name: repo.name,
        slug: repo.slug,
        description: repo.description ?? null,
        active: repo.active,
        isPrivate: repo.private,
        starred: repo.starred,
        defaultBranch: repo.default_branch?.name,
        githubLanguage: repo.github_language ?? null,
        ownerLogin: repo.owner?.login
      },
      message: `${actionLabel} repository **${repo.slug}** (active: ${repo.active}).`
    };
  })
  .build();
