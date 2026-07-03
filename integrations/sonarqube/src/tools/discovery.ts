import { z } from 'zod';
import {
  branchPullRequestInputs,
  branchSchema,
  componentSchema,
  createClient,
  mapBranch,
  mapComponent,
  mapPullRequest,
  pageSchema,
  paginationInputs,
  projectInput,
  projectKeyFromInput,
  pullRequestSchema,
  rawRecordSchema,
  readOnlyTool
} from './shared';

export let searchProjectsTool = readOnlyTool({
  name: 'Search Projects',
  key: 'search_projects',
  description:
    'Search SonarQube projects by text query or exact project keys. Use this before project-scoped tools when the project key is unknown or may be stale.',
  instructions: [
    'If the user names a project without saying it is an exact project key, search by query first instead of inventing a projectKey for project-scoped tools.',
    'Use the returned project key exactly in follow-up tools such as get_component, get_project_measures, search_issues, and list_component_tree.',
    'For SonarQube Cloud, provide organization input or configure a default organization.'
  ]
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('SonarQube Cloud organization key. Defaults to config.organization.'),
      query: z
        .string()
        .optional()
        .describe(
          'Search text for project name or key. Use this when the exact key is unknown.'
        ),
      projectKeys: z
        .array(z.string())
        .optional()
        .describe(
          'Specific project keys to include. Sent as SonarQube Cloud projects or SonarQube Server projectKeys.'
        ),
      qualifiers: z
        .array(z.string())
        .optional()
        .describe('Optional SonarQube Server component qualifiers such as TRK, APP, or VW.'),
      ...paginationInputs(50, 500)
    })
  )
  .output(
    z.object({
      projects: z.array(componentSchema).describe('Matching SonarQube projects/components.'),
      page: pageSchema.optional().describe('Pagination details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.searchProjects(ctx.input);
    let projects = result.items.map(mapComponent);

    return {
      output: {
        projects,
        page: result.page
      },
      message: `Found **${projects.length}** SonarQube projects.`
    };
  })
  .build();

export let getComponentTool = readOnlyTool({
  name: 'Get Component',
  key: 'get_component',
  description:
    'Get metadata for one exact SonarQube component key, such as a project, directory, or file. Use search_projects for project names and list_component_tree for file or directory names when the exact component key is unknown.'
})
  .input(
    z.object({
      component: z
        .string()
        .describe(
          'Exact component key to retrieve. For a project, use the project key returned by search_projects.'
        ),
      ...branchPullRequestInputs
    })
  )
  .output(
    z.object({
      component: componentSchema.describe('Normalized SonarQube component.'),
      ancestors: z.array(componentSchema).optional().describe('Ancestor components.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getComponent(ctx.input);
    let component =
      typeof data.component === 'object' && data.component !== null
        ? (data.component as Record<string, unknown>)
        : data;
    let ancestors = Array.isArray(data.ancestors)
      ? data.ancestors
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map(mapComponent)
      : undefined;

    return {
      output: {
        component: mapComponent(component),
        ancestors,
        raw: data
      },
      message: `Retrieved SonarQube component **${ctx.input.component}**.`
    };
  })
  .build();

export let listComponentTreeTool = readOnlyTool({
  name: 'List Component Tree',
  key: 'list_component_tree',
  description:
    'List child components under an exact SonarQube project, directory, or file component key. Use search_projects first when the project was described by name or partial key; use this to discover file component keys before get_source, get_scm_info, or get_duplications.'
})
  .input(
    z.object({
      component: z
        .string()
        .describe(
          'Exact root component key to browse, usually a project key from search_projects.'
        ),
      query: z.string().optional().describe('Search text for child components.'),
      qualifiers: z
        .array(z.string())
        .optional()
        .describe(
          'Component qualifiers to include, such as DIR for directories, FIL for source files, or UTS for tests. Omit for general browsing.'
        ),
      ...branchPullRequestInputs,
      ...paginationInputs(100, 500)
    })
  )
  .output(
    z.object({
      components: z.array(componentSchema).describe('Matching child components.'),
      page: pageSchema.optional().describe('Pagination details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listComponentTree(ctx.input);
    let components = result.items.map(mapComponent);

    return {
      output: {
        components,
        page: result.page
      },
      message: `Found **${components.length}** components under **${ctx.input.component}**.`
    };
  })
  .build();

export let listProjectBranchesTool = readOnlyTool({
  name: 'List Project Branches',
  key: 'list_project_branches',
  description:
    'List analyzed branches for a SonarQube project. Use this when the branch name is unknown before branch-scoped project, issue, measure, quality-gate, or component calls.'
})
  .input(z.object(projectInput))
  .output(
    z.object({
      projectKey: z.string().describe('Project key used for the request.'),
      branches: z.array(branchSchema).describe('Project branches.')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.listProjectBranches(projectKey);
    let branches = result.items.map(mapBranch);

    return {
      output: {
        projectKey,
        branches
      },
      message: `Found **${branches.length}** branches for SonarQube project **${projectKey}**.`
    };
  })
  .build();

export let listProjectPullRequestsTool = readOnlyTool({
  name: 'List Project Pull Requests',
  key: 'list_project_pull_requests',
  description:
    'List pull request analyses for a SonarQube project. Use this when the pull request id or key is unknown before pull-request-scoped project, issue, measure, quality-gate, or component calls.'
})
  .input(z.object(projectInput))
  .output(
    z.object({
      projectKey: z.string().describe('Project key used for the request.'),
      pullRequests: z.array(pullRequestSchema).describe('Project pull request analyses.')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.listProjectPullRequests(projectKey);
    let pullRequests = result.items.map(mapPullRequest);

    return {
      output: {
        projectKey,
        pullRequests
      },
      message: `Found **${pullRequests.length}** pull requests for SonarQube project **${projectKey}**.`
    };
  })
  .build();
