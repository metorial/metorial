import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific GitLab project by its ID or URL-encoded path (e.g. "my-group/my-project").`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .describe('Project ID or URL-encoded path (e.g. "my-group/my-project")')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Unique project ID'),
      name: z.string().describe('Project name'),
      nameWithNamespace: z.string().describe('Full project name including namespace'),
      pathWithNamespace: z.string().describe('Full project path including namespace'),
      description: z.string().nullable().describe('Project description'),
      visibility: z.string().describe('Project visibility level'),
      webUrl: z.string().describe('URL to the project'),
      defaultBranch: z.string().nullable().describe('Default branch name'),
      archived: z.boolean().describe('Whether the project is archived'),
      starCount: z.number().describe('Number of stars'),
      forksCount: z.number().describe('Number of forks'),
      openIssuesCount: z.number().describe('Number of open issues'),
      createdAt: z.string().describe('Project creation timestamp'),
      lastActivityAt: z.string().describe('Last activity timestamp'),
      creatorId: z.number().nullable().describe('Creator user ID'),
      namespace: z
        .object({
          namespaceId: z.number().describe('Namespace ID'),
          name: z.string().describe('Namespace name'),
          path: z.string().describe('Namespace path'),
          kind: z.string().describe('Namespace kind (user or group)')
        })
        .describe('Project namespace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let p = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        nameWithNamespace: p.name_with_namespace,
        pathWithNamespace: p.path_with_namespace,
        description: p.description,
        visibility: p.visibility,
        webUrl: p.web_url,
        defaultBranch: p.default_branch,
        archived: p.archived,
        starCount: p.star_count,
        forksCount: p.forks_count,
        openIssuesCount: p.open_issues_count,
        createdAt: p.created_at,
        lastActivityAt: p.last_activity_at,
        creatorId: p.creator_id,
        namespace: {
          namespaceId: p.namespace.id,
          name: p.namespace.name,
          path: p.namespace.path,
          kind: p.namespace.kind
        }
      },
      message: `Project **${p.name}** (\`${p.path_with_namespace}\`) — ${p.visibility}, ${p.open_issues_count} open issues, ⭐ ${p.star_count}`
    };
  })
  .build();
