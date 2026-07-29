import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let listRepositorySecurityAdvisories = SlateTool.create(spec, {
  name: 'List Repository Security Advisories',
  key: 'list_repository_security_advisories',
  description:
    'List repository security advisories for a GitHub repository, with optional lifecycle filtering and chronological sorting.',
  tags: { readOnly: true }
})
  .scopes(anyOf('security_events'))
  .input(
    z.object({
      owner: z.string().describe('The owner of the repository.'),
      repo: z.string().describe('The name of the repository.'),
      direction: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
      sort: z.enum(['created', 'published', 'updated']).optional().describe('Sort field.'),
      state: z
        .enum(['closed', 'draft', 'published', 'triage'])
        .optional()
        .describe('Filter by advisory state.')
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository in owner/name format'),
      advisories: z
        .array(z.record(z.string(), z.any()))
        .describe('Repository security advisories'),
      returnedCount: z.number().describe('Number of advisories returned')
    })
  )
  .handleInvocation(async ctx => {
    let advisories = await new GitHubSecurityApi(ctx.auth).listRepositorySecurityAdvisories(
      ctx.input.owner,
      ctx.input.repo,
      {
        direction: ctx.input.direction,
        sort: ctx.input.sort,
        state: ctx.input.state
      }
    );
    return {
      output: {
        repository: `${ctx.input.owner}/${ctx.input.repo}`,
        advisories,
        returnedCount: advisories.length
      },
      message: `Retrieved **${advisories.length}** security advisories from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
