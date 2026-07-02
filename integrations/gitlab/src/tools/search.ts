import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Search across GitLab for projects, issues, merge requests, milestones, code (blobs), commits, wiki content, and users. Can search globally, within a group, or within a specific project.`,
  instructions: [
    'For code search (scope "blobs"), the search term matches against file contents.',
    'Project-level search supports more scopes than global search.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum([
          'projects',
          'issues',
          'merge_requests',
          'milestones',
          'blobs',
          'commits',
          'wiki_blobs',
          'users'
        ])
        .describe('What to search for'),
      query: z.string().describe('Search term'),
      projectId: z.string().optional().describe('Scope search to a specific project'),
      groupId: z.string().optional().describe('Scope search to a specific group')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).describe('Search results (structure depends on scope)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let results = await client.search({
      scope: ctx.input.scope,
      search: ctx.input.query,
      projectId: ctx.input.projectId,
      groupId: ctx.input.groupId
    });

    let scopeLabel = ctx.input.projectId ? 'project' : ctx.input.groupId ? 'group' : 'global';

    return {
      output: { results },
      message: `Found **${results.length}** ${ctx.input.scope} matching "${ctx.input.query}" (${scopeLabel} search)`
    };
  })
  .build();
