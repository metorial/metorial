import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List GitLab projects accessible to the authenticated user. Filter by search term, ownership, membership, visibility, and archived status. Supports pagination for large result sets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search term to filter projects by name'),
      owned: z
        .boolean()
        .optional()
        .describe('Only list projects owned by the authenticated user'),
      membership: z
        .boolean()
        .optional()
        .describe('Only list projects the authenticated user is a member of'),
      visibility: z
        .enum(['public', 'internal', 'private'])
        .optional()
        .describe('Filter by project visibility'),
      archived: z.boolean().optional().describe('Filter by archived status'),
      orderBy: z
        .enum(['id', 'name', 'path', 'created_at', 'updated_at', 'last_activity_at'])
        .optional()
        .describe('Order by field'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      perPage: z.number().optional().describe('Number of results per page (max 100)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.number().describe('Unique project ID'),
          name: z.string().describe('Project name'),
          nameWithNamespace: z.string().describe('Full project name including namespace'),
          path: z.string().describe('Project path'),
          pathWithNamespace: z.string().describe('Full project path including namespace'),
          description: z.string().nullable().describe('Project description'),
          visibility: z.string().describe('Project visibility level'),
          webUrl: z.string().describe('URL to the project in GitLab'),
          defaultBranch: z.string().nullable().describe('Default branch name'),
          archived: z.boolean().describe('Whether the project is archived'),
          createdAt: z.string().describe('Project creation timestamp'),
          lastActivityAt: z.string().describe('Last activity timestamp')
        })
      ),
      totalPages: z.number().describe('Total number of pages available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let result = await client.listProjects({
      search: ctx.input.search,
      owned: ctx.input.owned,
      membership: ctx.input.membership,
      visibility: ctx.input.visibility,
      archived: ctx.input.archived,
      orderBy: ctx.input.orderBy,
      sort: ctx.input.sort,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let projects = result.projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      nameWithNamespace: p.name_with_namespace,
      path: p.path,
      pathWithNamespace: p.path_with_namespace,
      description: p.description,
      visibility: p.visibility,
      webUrl: p.web_url,
      defaultBranch: p.default_branch,
      archived: p.archived,
      createdAt: p.created_at,
      lastActivityAt: p.last_activity_at
    }));

    return {
      output: { projects, totalPages: result.totalPages },
      message: `Found **${projects.length}** projects${ctx.input.search ? ` matching "${ctx.input.search}"` : ''} (page ${ctx.input.page || 1} of ${result.totalPages})`
    };
  })
  .build();
