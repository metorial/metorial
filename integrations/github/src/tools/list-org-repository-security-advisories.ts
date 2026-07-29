import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubSecurityApi } from '../lib/github-security';
import { spec } from '../spec';

export let listOrgRepositorySecurityAdvisories = SlateTool.create(spec, {
  name: 'List Organization Repository Security Advisories',
  key: 'list_org_repository_security_advisories',
  description:
    'List repository security advisories across a GitHub organization, with optional lifecycle filtering and chronological sorting.',
  tags: { readOnly: true }
})
  .scopes(anyOf('security_events'))
  .input(
    z.object({
      org: z.string().describe('The organization login.'),
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
      organization: z.string().describe('GitHub organization login'),
      advisories: z
        .array(z.record(z.string(), z.any()))
        .describe('Organization repository security advisories'),
      returnedCount: z.number().describe('Number of advisories returned')
    })
  )
  .handleInvocation(async ctx => {
    let advisories = await new GitHubSecurityApi(
      ctx.auth
    ).listOrganizationRepositorySecurityAdvisories(ctx.input.org, {
      direction: ctx.input.direction,
      sort: ctx.input.sort,
      state: ctx.input.state
    });
    return {
      output: {
        organization: ctx.input.org,
        advisories,
        returnedCount: advisories.length
      },
      message: `Retrieved **${advisories.length}** repository security advisories for **${ctx.input.org}**.`
    };
  })
  .build();
